<h1>DEPRECATED</h1>
This repository has been deprecated and all its content was moved to the new one located here https://github.com/autodesk-platform-services/aps-create-revit-family


# Create Revit Families (Windows) with Design Automation

[![Node.js](https://img.shields.io/badge/Node.js->=10.0.0-blue.svg)](https://nodejs.org/)
![Platforms](https://img.shields.io/badge/Web-Windows%20%7C%20MacOS%20%7C%20Linux-lightgray.svg)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)
[![Design-Automation](https://img.shields.io/badge/Design%20Automation-v3-green.svg)](http://developer.autodesk.com/)


![Windows](https://img.shields.io/badge/Plugins-Windows-lightgrey.svg)
![.NET](https://img.shields.io/badge/.NET%20Framework-4.8-blue.svg)
[![Revit-2022](https://img.shields.io/badge/Revit-2022-lightgrey.svg)](http://autodesk.com/revit)


![Advanced](https://img.shields.io/badge/Level-Advanced-red.svg)
[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](http://opensource.org/licenses/MIT)


# Description

This sample demostrated how to create a window family using Design Automation for Revit API **V3**.

# Thumbnail
![thumbnail](/thumbnail.png)

# Live Demo
[https://familycreationsample.herokuapp.com/](https://familycreationsample.herokuapp.com/)

# Main Parts of The Work
1. Migrate the existing Revit WindowWizard Plugin to be used within AppBundle of Design Automation for Revit. Please check [PlugIn](./CreateWindow/PlugIn/) 

2. Create your App, upload the AppBundle, define your Activity and test the workitem with the Postman collection under [Postman Collection](./CreateWindow/PostmanCollection/), or you can refer ([https://youtu.be/1NCeH7acIko](https://youtu.be/1NCeH7acIko)) and simply use the `Configure` button in the Web Application to create the Appbundle & Activity.

3. Create the Web App to call the workitem.

# Web App Setup

## Prerequisites

1. **Forge Account**: Learn how to create a Forge Account, activate subscription and create an app at [this tutorial](http://learnforge.autodesk.io/#/account/). 
2. **Visual Code**: Visual Code (Windows or MacOS)
3. **ngrok**: Routing tool, [download here](https://ngrok.com/)
4. **Revit 2019**: required to compile changes into the plugin
5. **Window family template**: A family template that is required while creating window family, you can use this [sample template](./CreateWindow/WindowFamily.rft)
6. **JavaScript ES6** syntax for server-side
7. **JavaScript** basic knowledge with **jQuery**


For using this sample, you need an Autodesk developer credentials. Visit the [Forge Developer Portal](https://developer.autodesk.com), sign up for an account, then [create an app](https://developer.autodesk.com/myapps/create). For this new app, use **http://localhost:3000/api/forge/callback/oauth** as Callback URL, although is not used on 2-legged flow. Finally take note of the **Client ID** and **Client Secret**.

## Running locally

Install [NodeJS](https://nodejs.org), version 8 or newer.

Clone this project or download it (this `nodejs` branch only). It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

    git clone -b nodejs https://github.com/Autodesk-Forge/design.automation-nodejs-revit.window.family.create

To run it, install the required packages, set the enviroment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal)

    npm install
    export FORGE_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    export FORGE_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    export FORGE_CALLBACK_URL=<<YOUR CALLBACK URL>>
    export FORGE_WEBHOOK_URL=<<YOUR DESIGN AUTOMATION FOR REVIT CALLBACK URL>>
    export DESIGN_AUTOMATION_NICKNAME=<<YOUR DESIGN AUTOMATION FOR REVIT NICK NAME>>
    export DESIGN_AUTOMATION_ACTIVITY_NAME=<<YOUR DESIGN AUTOMATION FOR REVIT ACTIVITY NAME>>
    export DESIGN_AUTOMATION_FAMILY_TEMPLATE=<<YOUR REVIT WINDOW FAMILY TEMPLATE FILE URL>>    
    npm start

Windows (use **Node.js command line** from Start menu)

    npm install
    set FORGE_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    set FORGE_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    set FORGE_CALLBACK_URL=<<YOUR CALLBACK URL>>
    set FORGE_WEBHOOK_URL=<<YOUR DESIGN AUTOMATION FOR REVIT CALLBACK URL>>
    set DESIGN_AUTOMATION_NICKNAME=<<YOUR DESIGN AUTOMATION FOR REVIT NICK NAME>>
    set DESIGN_AUTOMATION_ACTIVITY_NAME=<<YOUR DESIGN AUTOMATION FOR REVIT ACTIVITY NAME>>
    set DESIGN_AUTOMATION_FAMILY_TEMPLATE=<<YOUR REVIT WINDOW FAMILY TEMPLATE FILE URL>>    
    npm start

### ngrok
Run `ngrok http 3000` to create a tunnel to your local machine, then copy the address into the `FORGE_WEBHOOK_URL` environment variable. Please check [WebHooks](https://forge.autodesk.com/en/docs/webhooks/v1/tutorials/configuring-your-server/) for details. 

### Start the app
Open the browser: [http://localhost:3000](http://localhost:3000), the way to create a window family should be straightforwd, just follow the steps:
1. Select window style, either `Double Hung`, `Fixed`, or `Sliding Double`
2. Add a couple of family types, and change the parameters accordingly, set the material for `Glass Pane` and `Sash`, and change the family file name if necessary
3. Select a folder in your BIM360 project, the new created family file will be saved there
4. Click the Create button, and see the result in BIM360

`Note`: When you deploy the app, you have to open the `Configure` button to create the AppBundle & Activity before running the Export|Import feature, please check the video for the steps at [https://youtu.be/1NCeH7acIko](https://youtu.be/1NCeH7acIko)

## Deployment

To deploy this application to Heroku, the **Callback URL** for Forge must use your `.herokuapp.com` address. After clicking on the button below, at the Heroku Create New App page, set your Client ID, Secret, Callback URL and Revit Design Automation variables for Forge.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Autodesk-Forge/design.automation-nodejs-revit.window.family.create)

Watch [this video](https://www.youtube.com/watch?v=Oqa9O20Gj0c) as reference on how to deploy samples to Heroku.


## Packages used

The [Autodesk Forge](https://www.npmjs.com/package/forge-apis) packages is included by default. Some other non-Autodesk packaged are used, including [express](https://www.npmjs.com/package/express) and [multer](https://www.npmjs.com/package/multer) for upload.

## Further Reading

Documentation:

- [Design Automation API](https://forge.autodesk.com/en/docs/design-automation/v3/developers_guide/overview/)
- [BIM 360 API](https://developer.autodesk.com/en/docs/bim360/v1/overview/) and [App Provisioning](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps)
- [Data Management API](https://developer.autodesk.com/en/docs/data/v2/overview/)

Desktop APIs:

- [Revit](https://knowledge.autodesk.com/support/revit-products/learn-explore/caas/simplecontent/content/my-first-revit-plug-overview.html)

## Tips & Tricks
- The Window family template which is used to create the family should be uploaded first.
- Before using the sample to call the workitem, you need to setup your Appbundle & Activity of Design Automation, you can follow my Postman script to understand the whole process, or you can simply use the `Configure` button in the Web Application to create the Appbundle & Activity([https://youtu.be/1NCeH7acIko](https://youtu.be/1NCeH7acIko)). 

## Limitation
- Not support multiple version of the new created family, change the family name is it's already existed under the folder, or create|select a new folder for the same name of Revit family file.
- Only US region is supported, EU region is not supported currently.

## Troubleshooting

After installing Github desktop for Windows, on the Git Shell, if you see a ***error setting certificate verify locations*** error, use the following:

    git config --global http.sslverify "false"

## License
This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

## Written by

Zhong Wu, [Forge Partner Development](http://forge.autodesk.com)
