# Installation
> `npm install --save @types/node-red__editor-api`

# Summary
This package contains type definitions for @node-red/editor-api (https://github.com/node-red/node-red/tree/master/packages/node_modules/%40node-red/editor-api).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node-red__editor-api.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node-red__editor-api/index.d.ts)
````ts
import { Express, NextFunction, Request, Response } from "express";
import { Server as HttpsServer } from "https";

import * as runtime from "@node-red/runtime";

declare const editorAPI: editorAPI.EditorAPIModule;

export = editorAPI;

declare namespace editorAPI {
    interface Auth {
        needsPermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => void;
    }
    interface EditorAPIModule {
        /**
         * Initialise the module.
         * @param  settings   The runtime settings
         * @param  _server    An instance of HTTP Server
         * @param  storage    An instance of Node-RED Storage
         * @param  runtimeAPI An instance of Node-RED Runtime
         */
        init: (
            settings: runtime.LocalSettings,
            _server: HttpsServer,
            storage: runtime.StorageModule,
            runtimeAPI: runtime.RuntimeModule,
        ) => void;

        /**
         * Start the module.
         */
        start: () => Promise<void>;

        /**
         * Stop the module.
         */
        stop: () => Promise<void>;

        auth: Auth;

        /**
         * The Express app used to serve the Node-RED Editor
         */
        readonly httpAdmin: Express;
    }
}

````

### Additional Details
 * Last updated: Fri, 08 Mar 2024 17:07:21 GMT
 * Dependencies: [@types/express](https://npmjs.com/package/@types/express), [@types/node-red__runtime](https://npmjs.com/package/@types/node-red__runtime)

# Credits
These definitions were written by [Alex Kaul](https://github.com/alexk111), and [Tadeusz Wyrzykowski](https://github.com/Shaquu).
