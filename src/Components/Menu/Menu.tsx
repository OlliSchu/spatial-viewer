/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useState } from "react";
import { ActionIcon, Menu, NumberInput } from "@mantine/core";
import {
  CalendarTime,
  Camera,
  Cut,
  Menu2,
  RulerMeasure,
} from "tabler-icons-react";
import {
  ClickMode,
  ViewerContext,
  ViewerContextType,
} from "../Core/Context/ViewerContext";

export function ViewerMenu() {
  const {
    clickMode,
    setClickMode,
    reRenderViewer,
    renderer,
    clipPlanes,
    clipHelper,
  } = useContext(ViewerContext) as ViewerContextType;

  const [clipEnabled, setClipEnabled] = useState<boolean>(false);
  const [clipHeight, setClipHeight] = useState<number>(0);

  function setMenuValues() {
    if (renderer) {
      setClipEnabled(!renderer.localClippingEnabled);
      setClipHeight(clipPlanes[0].constant);
    }
  }

  const iconSize: number = 20;

  function setMeasure(event) {
    if (clickMode !== ClickMode.Measure) {
      setClickMode(ClickMode.Measure);
    }
    // } else {
    //   setClickMode(ClickMode.Select);
    // }
  }

  function setBoundingBox(event) {
    renderer.localClippingEnabled = !renderer.localClippingEnabled;
    clipHelper.visible = !clipHelper.visible;
    reRenderViewer();
  }

  function setClipPlaneValue(event) {
    console.log(event, clipPlanes);
    clipPlanes[0].constant = event;
    reRenderViewer();
  }

  return (
    <Menu onOpen={setMenuValues} position="top" shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon color="blue" size="lg" radius="xl">
          <Menu2 />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Viewer</Menu.Label>
        <Menu.Item onClick={setMeasure} icon={<RulerMeasure size={iconSize} />}>
          Measure
        </Menu.Item>
        <Menu.Item onClick={setBoundingBox} icon={<Cut size={iconSize} />}>
          Section Box
        </Menu.Item>
        <NumberInput
          onChange={setClipPlaneValue}
          disabled={clipEnabled}
          defaultValue={clipHeight}
          precision={2}
          step={0.05}
          stepHoldDelay={500}
          stepHoldInterval={100}
          placeholder="Section Height"
          label="Section Height"
          withAsterisk
        />
        <Menu.Item icon={<Camera size={iconSize} />}>Screenshot</Menu.Item>

        <Menu.Divider />
        <Menu.Label>Timeline</Menu.Label>
        <Menu.Item icon={<CalendarTime size={iconSize} />}>
          Adjust Timeline
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
