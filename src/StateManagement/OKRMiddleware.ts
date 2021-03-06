import * as Actions from "./OKRActionTypes";
import { ObjectiveService } from '../Objective/ObjectiveService';
import { Objective } from '../Objective/Objective';
import { AreaService } from '../Area/AreaService';
import { TimeFrameService } from '../TimeFrame/TimeFrameService';
import { Area } from '../Area/Area';
import { OKRDocument } from '../Data/OKRDocument';
import { OKRDataService } from '../Data/OKRDataService';
import { OKRMainState } from "./OKRState";
import { Guid } from "guid-typescript";
import { WorkItemService } from "../Data/WorkItemService";
import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import { TimeFrameSet } from "../TimeFrame/TimeFrame";

export const applyMiddleware = (dispatch, state) => action =>
    dispatch(action) || runMiddleware(dispatch, action, state);

const handleGetAllError = (error, dispatch, zeroDataAction: string, errorAction: string) => {
    // This error means we haven't initialized anything yet
    if (error && error.serverError && error.serverError.typeKey === "DocumentCollectionDoesNotExistException") {
        const emptyPayload = [];
        dispatch({
            type: zeroDataAction,
            payload: emptyPayload
        })
    }
    else {
        // Dispatch error
        dispatch({
            type: errorAction,
            payload: error
        })
    }
}

const runMiddleware = (dispatch, action, state: OKRMainState) => {
    switch (action.type) {
        case Actions.getObjectives:
            ObjectiveService.instance.getAll(action.payload.timeFrameId).then((allObjectives: Objective[]) => {
                dispatch({
                    type: Actions.getObjectivesSucceed,
                    payload: allObjectives
                })
            }, (error) => {
                handleGetAllError(error, dispatch, Actions.getObjectivesSucceed, Actions.getObjectivesFailed)
            });
            break;

        case Actions.getAreas:
            AreaService.instance.getAll().then((allAreas: Area[]) => {
                dispatch({
                    type: Actions.getAreasSucceed,
                    payload: allAreas
                });
            }, (error) => {
                handleGetAllError(error, dispatch, Actions.getAreasSucceed, Actions.areaOperationFailed);
            });
            break;

        case Actions.getTimeFrames:
            TimeFrameService.instance.getAll().then((allTimeFrames: TimeFrameSet[]) => {
                dispatch({
                    type: Actions.getTimeFramesSucceed,
                    payload: allTimeFrames[0]
                });
            }, (error) => {
                handleGetAllError(error, dispatch, Actions.getTimeFramesSucceed, Actions.timeFrameOperationFail);
            });
            break;

        case Actions.editTimeFrame:
            TimeFrameService.instance.save(action.payload).then((updated) => {
                if (action.payload.currentTimeFrameId !== state.displayedTimeFrame.id) {
                    ObjectiveService.instance.getAll(action.payload.currentTimeFrameId).then((allObjectives: Objective[]) => {
                        dispatch({
                            type: Actions.updateCurrentTimeFrameSucceed,
                            objectives: allObjectives,
                            timeFrames: updated
                        });
                    }, (error) => {
                        if (error && error.serverError && error.serverError.typeKey === "DocumentCollectionDoesNotExistException") {
                            dispatch({
                                type: Actions.updateCurrentTimeFrameSucceed,
                                objectives: [],
                                timeFrames: updated
                            });
                        }
                        else {
                            dispatch({
                                type: Actions.timeFrameOperationFail,
                                error: error
                            });
                        }
                    });
                } else {
                    dispatch({
                        type: Actions.editTimeFrameSucceed,
                        payload: updated
                    });
                }
            }, (error) => {
                dispatch({
                    type: Actions.timeFrameOperationFail,
                    error: error
                });
            });
            break;

        case Actions.getProjectName:
            OKRDataService.getProjectName().then((projectName: string) => {
                dispatch({
                    type: Actions.getProjectNameSucceed,
                    projectName: projectName
                });
            }, (error) => {
                dispatch({
                    type: Actions.getProjectNameFailed,
                    error: error
                });
            });
            break;
        case Actions.editOKR:
            ObjectiveService.instance.save(action.payload, state.displayedTimeFrame.id).then((updated) => {
                dispatch({
                    type: Actions.editOKRSucceed,
                    payload: updated
                });
            }, (error) => {
                dispatch({
                    type: Actions.objectiveOperationFailed,
                    error: error
                });
            });
            break;
        case Actions.editKRStatus:
            ObjectiveService.instance.save(action.payload, state.displayedTimeFrame.id).then((updated) => {
                dispatch({
                    type: Actions.editOKRSucceed,
                    payload: updated
                });
            }, (error) => {
                dispatch({
                    type: Actions.objectiveOperationFailed,
                    error: error
                });
            });
            break;
        case Actions.createOKR:
            const objectiveOrders = action.payload.objectives.map((value: Objective) => value.order);
            action.payload.data.order = Math.max(...objectiveOrders, 0) + 10;
            ObjectiveService.instance.create(action.payload.data, state.displayedTimeFrame.id).then((created) => {
                dispatch({
                    type: Actions.createOKRSucceed,
                    payload: created
                });
            }, (error) => {
                dispatch({
                    type: Actions.objectiveOperationFailed,
                    error: error
                });
            });
            break;

        case Actions.createFirstArea:
            // If we don't have any time frames, create one so the objective page works on first run
            const id = Guid.create().toString();
            const newTimeFrameSet: TimeFrameSet = {
                timeFrames: [
                    {
                        name: "Current",
                        id: id,
                        order: 0
                    }
                ],
                currentTimeFrameId: id,
            };

            const timeFramePromise = TimeFrameService.instance.create(newTimeFrameSet);
            const areaPromise = AreaService.instance.create(action.payload);

            Promise.all([timeFramePromise, areaPromise]).then(([timeFrameSet, area]) => {
                dispatch({
                    type: Actions.createFirstAreaSuccess,
                    payload: { timeFrameSet: timeFrameSet, area: area }
                })
            }, (error) => {
                dispatch({
                    type: Actions.createAreaFailed,
                    error: error
                })
            })
            break;

        /**
         * This should only be used on FIRST create. Time frames are stored as a collection. Adding a 
         * time frame later is an edit to the collection, not a create. 
         */
        case Actions.createTimeFrame:
            TimeFrameService.instance.create(action.payload).then((created) => {
                dispatch({
                    type: Actions.createTimeFrameSucceed,
                    payload: created
                })
            }, (error) => {
                dispatch({
                    type: Actions.timeFrameOperationFail,
                    error: error
                })
            }
            )
        break;
        
        case Actions.createArea:
            AreaService.instance.create(action.payload.data).then((created) => {
                dispatch({
                    type: Actions.createAreaSucceed,
                    payload: created
                });
            }, (error) => {
                dispatch({
                    type: Actions.createAreaFailed,
                    error: error
                });
            });

            break;
        case Actions.editArea:
            AreaService.instance.save(action.payload).then((updated) => {
                dispatch({
                    type: Actions.editAreaSucceed,
                    payload: updated
                });
            }, (error) => {
                dispatch({
                    type: Actions.areaOperationFailed,
                    error: error
                });
            });
            break;
        case Actions.removeOKR:
            ObjectiveService.instance.delete((document: OKRDocument) => {
                return document.id === action.payload.id;
            }, state.displayedTimeFrame.id).then(() => {
                dispatch({
                    type: Actions.removeOKRSucceed,
                    id: action.payload.id
                });
            }, (error) => {
                dispatch({
                    type: Actions.objectiveOperationFailed,
                    error: error
                });
            });
            break;
        case Actions.removeArea:
            AreaService.instance.delete((area: Area) => {
                return area.id === action.payload.id;
            }).then(() => {
                dispatch({
                    type: Actions.removeAreaSucceed,
                    id: action.payload.id
                });
                ObjectiveService.instance.delete((okr: Objective) => {
                    return okr.AreaId === action.payload.areaId;
                }, state.displayedTimeFrame.id);
            }, (error) => {
                dispatch({
                    type: Actions.areaOperationFailed,
                    error: error
                });
            });
            break;

        // WORK ITEMS
        case Actions.getWorkItems:
            WorkItemService.getInstance().getWorkItems(action.payload).then((workItems: WorkItem[]) => {
                dispatch({
                    type: Actions.getWorkItemsSucceed,
                    workItems: workItems
                });
            },
                (error) => {
                    dispatch({
                        type: Actions.objectiveOperationFailed,
                        error: error
                    });
                });
            break;
        case Actions.addWorkItems:
            // TODO: validate the input ids.
            WorkItemService.getInstance().getWorkItems(action.payload.data.ids).then((workItems: WorkItem[]) => {
                var objective = action.payload.objectives.filter((objective: Objective) => {
                    return objective.id === action.payload.data.objectiveId;
                })[0];

                workItems.forEach((workItem: WorkItem) => {
                    if (objective.WorkItems === undefined) {
                        objective.WorkItems = [];
                    }
                    if (objective.WorkItems.indexOf(workItem.id) === -1) {
                        objective.WorkItems.push(workItem.id);
                    }
                });

                ObjectiveService.instance.save(objective, state.displayedTimeFrame.id).then((updated) => {
                    dispatch({
                        type: Actions.addWorkItemsSucceed,
                        workItems: workItems,
                        objective: updated
                    });
                }, (error) => {
                    dispatch({
                        type: Actions.objectiveOperationFailed,
                        error: error
                    });
                });
            }, (error) => {
                dispatch({
                    type: Actions.objectiveOperationFailed,
                    error: error
                });
            });
            break;
        case Actions.deleteWorkItems:
            var objective = action.payload.objectives.filter((objective: Objective) => {
                return objective.id === action.payload.data.objectiveId;
            })[0];
            objective.WorkItems = objective.WorkItems.filter((id: number) => {
                return id !== action.payload.data.id;
            });
            ObjectiveService.instance.save(objective, state.displayedTimeFrame.id).then((updated) => {
                dispatch({
                    type: Actions.deleteWorkItemsSucceed,
                    payload: updated
                });
            }, (error) => {
                dispatch({
                    type: Actions.objectiveOperationFailed,
                    error: error
                });
            });
            break;
        case Actions.openWorkItem:
            WorkItemService.getInstance().openWorkItem(action.payload)
            break;
    }
}