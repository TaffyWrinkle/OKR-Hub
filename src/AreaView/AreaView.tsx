import * as React from "react";
import { AreaGrid } from "./AreaGrid";
import { Header } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { AddAreaPanel } from '../AreaPanel/AddAreaPanel';
import { useStateValue } from "../StateMangement/StateProvider";
import { useEffect } from "react";
import { NavigationConstants } from "../OKRConstants";
import { Area } from "../Area/Area";

export const AreaView: React.FunctionComponent<{}> = props => {
    const stateContext = useStateValue();

    useEffect(() => {
        if (stateContext.state.objectives.length === 0) {
            stateContext.actions.getObjectives(null);
        }
        if (stateContext.state.areas.length === 0) {
            stateContext.actions.getAreas(null);
        }
    });

    const areaNavigateCallBack = (area: Area): void => {
        stateContext.actions.navigatePage({
            selectedArea: area,
            pageLocation: NavigationConstants.DetailView
        })
    }

    const editAreaCallback = (area: Area): void => {
        stateContext.actions.editArea(area)
    }

    const commandBarItems: IHeaderCommandBarItem[] = [
        {
            important: true,
            id: "create-area",
            text: "New Area", // TODO: Resource file for localization
            onActivate: () => {
                stateContext.actions.toggleAreaPanel({
                    expanded: true
                });
            },
            iconProps: {
                iconName: "Add"
            }
        }
    ];

    let content = <div>Loading...</div>;

    if (stateContext.state.areas) {
        content =
            <div>
                <Header
                    className={"area-view-header"}
                    commandBarItems={[...commandBarItems]}
                    title={"Azure Devops"}
                />
                <AddAreaPanel />
                <AreaGrid areas={stateContext.state.areas} objectives={stateContext.state.objectives} navigateCallback={areaNavigateCallBack} updateAreaCallback={editAreaCallback} />
            </div>
    }

    return content;
}