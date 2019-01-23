# design.automation-nodejs-revit.window.family.create

[![Node.js](https://img.shields.io/badge/Node.js-8.0-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-4.0-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/Web-Windows%20%7C%20MacOS%20%7C%20Linux-lightgray.svg)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)
[![Design-Automation](https://img.shields.io/badge/Design%20Automation-v3-green.svg)](http://developer.autodesk.com/)


![Windows](https://img.shields.io/badge/Plugins-Windows-lightgrey.svg)
![.NET](https://img.shields.io/badge/.NET%20Framework-4.7-blue.svg)
[![Revit-2019](https://img.shields.io/badge/Revit-2019-lightgrey.svg)](http://autodesk.com/revit)


![Advanced](https://img.shields.io/badge/Level-Advanced-red.svg)
[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](http://opensource.org/licenses/MIT)


# Description

This sample demostrated how to create a window family using Design Automation for Revit API **V3**.

# Thumbnail
![thumbnail](/public/res/screenshot.png)

# Live Demo
[https://familycreationsample.herokuapp.com/](https://familycreationsample.herokuapp.com/)

# Main Parts of The Work
1. Migrate the existing Revit WindowWizard Plugin to be used within AppBundle of Design Automation for Revit. Please check [PlugIn](./CreateWindow/PlugIn/) 

2. Create your App, upload the AppBundle, define your Activity and test the workitem with the Postman collection under [Postman Collection](./CreateWindow/PostmanCollection/) 

3. Create the Web App to call the workitem.

# Web App Setup

## Prerequisites

1. **Forge Account**: Learn how to create a Forge Account, activate subscription and create an app at [this tutorial](http://learnforge.autodesk.io/#/account/). 
2. **Visual Code**: Visual Code (Windows or MacOS).
3. **JavaScript ES6** syntax for server-side
4. **JavaScript** basic knowledge with **jQuery**


For using this sample, you need an Autodesk developer credentials. Visit the [Forge Developer Portal](https://developer.autodesk.com), sign up for an account, then [create an app](https://developer.autodesk.com/myapps/create). For this new app, use **http://localhost:3000/api/forge/callback/oauth** as Callback URL, although is not used on 2-legged flow. Finally take note of the **Client ID** and **Client Secret**.

## Running locally

Install [NodeJS](https://nodejs.org), version 8 or newer.

Clone this project or download it (this `nodejs` branch only). It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

    git clone -b nodejs https://github.com/JohnOnSoftware/design.automation.revit.create.family.nodejs.sample

To run it, install the required packages, set the enviroment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal)

    npm install
    export FORGE_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    export FORGE_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    export FORGE_CALLBACK_URL=<<YOUR CALLBACK URL>>
    export FORGE_WORK_ITEM_CALLBACK_URL=<<YOUR WORKITEM CALLBACK URL>>
    npm start

Windows (use **Node.js command line** from Start menu)

    npm install
    set FORGE_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    set FORGE_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    set FORGE_CALLBACK_URL=<<YOUR CALLBACK URL>>
    set FORGE_WORK_ITEM_CALLBACK_URL=<<YOUR WORKITEM CALLBACK URL>>
    npm start

Open the browser: [http://localhost:3000](http://localhost:3000).

## Main Backend API used
### File upgrade API based on Design Automation API
- POST      /api/forge/da4revit/v1/families
- GET       /api/forge/da4revit/v1/families/:family_workitem_id
- DELETE    /api/forge/da4revit/v1/families/:family_workitem_id
- POST      /api/forge/da4revit/callback

### File/Folder operation API based on Data Management API
- POST      /api/forge/datamanagement/v1/folder
- DELETE    /api/forge/datamanagement/v1/folder/:folder_url
- GET       /api/forge/datamanagement/v1

### User information API
- GET       /api/forge/user/v1/profile

### OAuth information API
- GET       /api/forge/oauth/v1/url
- GET       /api/forge/oauth/v1/signout
- GET       /api/forge/oauth/v1/token
- GET      /api/forge/callback/oauth


## Packages used

The [Autodesk Forge](https://www.npmjs.com/package/forge-apis) packages is included by default. Some other non-Autodesk packaged are used, including [express](https://www.npmjs.com/package/express) and [multer](https://www.npmjs.com/package/multer) for upload.

## Further Reading

Documentation:

- [Design Automation API](https://forge.autodesk.com/en/docs/design-automation/v3/developers_guide/overview/)
- [BIM 360 API](https://developer.autodesk.com/en/docs/bim360/v1/overview/) and [App Provisioning](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps)
- [Data Management API](https://developer.autodesk.com/en/docs/data/v2/overview/)

## Tips & Tricks
 **/api/forge/da4revit/callback**, the endpoint is a webhook that would be invoked by the Design Automation API, you need to use ngrok to configure your Local Server for testing, please check [WebHooks](https://forge.autodesk.com/en/docs/webhooks/v1/tutorials/configuring-your-server/) for details. 

## Troubleshooting

After installing Github desktop for Windows, on the Git Shell, if you see a ***error setting certificate verify locations*** error, use the following:

    git config --global http.sslverify "false"

## Limitation
- The Window family template which is used to create the family should be uploaded first.

## License
This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

## Written by

Zhong Wu, [Forge Partner Development](http://forge.autodesk.com)
