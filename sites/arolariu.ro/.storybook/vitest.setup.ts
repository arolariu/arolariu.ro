import * as addonA11yPreview from "@storybook/addon-a11y/preview";
import {setProjectAnnotations} from "@storybook/nextjs-vite";

import * as previewAnnotations from "./preview";

setProjectAnnotations([previewAnnotations, addonA11yPreview]);
