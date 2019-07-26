import match from 'conditional-expression';
import * as Actions from "./OKRActionTypes";
import { ObjectiveService } from '../Objective/ObjectiveService';
import { Objective } from '../Objective/Objective';
import { AreaService } from '../Area/AreaService';
import { Area } from '../Area/Area';

export const applyMiddleware = dispatch => action =>
  dispatch(action) ||
  match(action.type)
    .equals(Actions.getObjectives).then(()=> {
        if (!action.payload || !action.payload.area) {
            ObjectiveService.instance.getAll().then((allObjectives: Objective[]) => {
                dispatch({
                    type: Actions.getObjectivesSucceed,
                    payload: allObjectives
                })
            }, (error)=> {
                dispatch({
                    type: Actions.getObjectivesFailed,
                    error: error
                });
            })
        }
        else {
            ObjectiveService.instance.getObjectivesByArea(action.payload.area).then((objectives)=> {
                dispatch({
                    type: Actions.getObjectivesSucceed,
                    payload: objectives
                });
            }, (error)=> {
                dispatch({
                    type: Actions.getObjectivesFailed,
                    error: error
                });
            });
        }
        
    })
    .equals(Actions.getAreas).then(() => {
        AreaService.instance.getAll().then((allAreas: Area[]) => {
            dispatch({
                type: Actions.getAreasSucceed,
                payload: allAreas
            });
        }, (error)=> {
            dispatch({
                type: Actions.getAreasFailed,
                error: error
            });
        });
    })
    .equals(Actions.editOKR).then(() => {
        ObjectiveService.instance.save(action.payload).then((updated) => {
            dispatch({
                type: Actions.editOKRSucceed,
                payload: updated
            });
            }, (error) => {
            dispatch({
                type: Actions.editOKRFailed,
                error: error
            });
        });
    })
    .equals(Actions.createOKR).then(() => {
        ObjectiveService.instance.create(action.payload).then((created) => {
            dispatch({
                type: Actions.createOKRSucceed,
                payload: created
            });
        }, (error) => {
            dispatch({
                type: Actions.createOKRFailed,
                error: error
            });
        });
    })
    .equals(Actions.createArea).then(() => {
        AreaService.instance.create(action.payload).then((created) => {
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
    })
    .equals(Actions.editArea).then(() => {
        AreaService.instance.save(action.payload).then((updated) => {
            dispatch({
                type: Actions.editAreaSucceed,
                payload: updated
            });
            }, (error) => {
            dispatch({
                type: Actions.editAreaFailed,
                error: error
            });
        });
    })
    .else(null);