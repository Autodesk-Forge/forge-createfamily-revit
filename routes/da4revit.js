/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

const express = require('express');

const {
    ItemsApi,
    VersionsApi
} = require('forge-apis');

const {
    getNewCreatedStorageInfo,
    createBodyOfPostItem,
    createWindowFamily,
    cancelWrokitem,
    getWorkitemStatus,
    workitemList
} = require('./common/da4revitImp');

const { OAuth } = require('./common/oauth');
const { designAutomation }= require('../config');

const SOCKET_TOPIC_WORKITEM = 'Workitem-Notification';

let router = express.Router();


// Support more family types
const FamileyType = {
    WINDOW : 1,
    DOOR   : 2,
}

/////////////////////////////////////////////////////////////////////
// Middleware for obtaining a token for each request.
/////////////////////////////////////////////////////////////////////
router.use(async (req, res, next) => {
    // Get the access token
    const oauth = new OAuth(req.session);
    let credentials = await oauth.getInternalToken();
    let oauth_client = oauth.getClient();

    req.oauth_client = oauth_client;
    req.oauth_token = credentials;
    next();
});


/////////////////////////////////////////////////////////////////////
// Endpoint to create a new Revit family
/////////////////////////////////////////////////////////////////////
router.post('/da4revit/v1/families', async(req, res, next)=>{
    const params             = req.body.Params;
    const destinateFolderUrl = req.body.TargetFolder;

    // Get all the parameters from client
    if (params === '' || destinateFolderUrl === '') {
        res.status(400).end();
        return;
    }
    const destinateFolderParams = destinateFolderUrl.split('/');
    if ( destinateFolderParams.length < 3) {
        console.log('info: the url format is not correct');
        res.status(400).end('the url format is not correct');
        return;
    }

    const destinateFolderType = destinateFolderParams[destinateFolderParams.length - 2];
    if (destinateFolderType !== 'folders') {
        console.log('info: not supported item');
        res.status(400).end('not supported item');
        return;
    }

    const destinateFolderId = destinateFolderParams[destinateFolderParams.length - 1];
    const destinateProjectId = destinateFolderParams[destinateFolderParams.length - 3];

    try {
        ////////////////////////////////////////////////////////////////////////////////
        // create a new storage for the ouput item version
        const storageInfo = await getNewCreatedStorageInfo(destinateProjectId, destinateFolderId, params.FileName, req.oauth_client, req.oauth_token);
        if (storageInfo === null) {
            console.log('error: failed to create the storage');
            res.status(500).end('failed to create the storage');
            return;
        }
        const outputUrl = storageInfo.StorageUrl;

        const createFirstVersionBody = createBodyOfPostItem(params.FileName, destinateFolderId, storageInfo.StorageId, designAutomation.bim360_Item_Type, designAutomation.bim360_Version_Type);
        if (createFirstVersionBody === null) {
            console.log('failed to create body of Post Item');
            res.status(500).end('failed to create body of Post Item');
            return;
        }
        
        ////////////////////////////////////////////////////////////////////////////////
        // use 2 legged token for design automation
        const oauth = new OAuth(req.session);
        const oauth_client = oauth.get2LeggedClient();;
        const oauth_token = await oauth_client.authenticate(); 
        let familyCreatedRes = null;
        switch (params.FamilyType) {
            case FamileyType.WINDOW:
                if( params.WindowParams === null || params.WindowParams.Types.length === 0 ){
                    console.log('The inpute Window Types is not correct');
                    res.status(400).end('The inpute Window Types is not correct');
                    return;
                }
                familyCreatedRes = await createWindowFamily(designAutomation.revit_family_template, params.WindowParams, outputUrl, destinateProjectId, createFirstVersionBody, req.oauth_token, oauth_token);
                break;

            case FamilyType.DOOR:
                // TBD:
                break;

            default:
                break;

        };
        if (familyCreatedRes === null || familyCreatedRes.statusCode !== 200) {
            console.log('failed to create the revit family file');
            res.status(500).end('failed to create the revit family file');
            return;
        }
        console.log('Submitted workitem:  '+ familyCreatedRes.body.id);
        const familyCreatedInfo = {
            "fileName": params.FileName,
            "workItemId": familyCreatedRes.body.id,
            "workItemStatus": familyCreatedRes.body.status
        };
        res.status(201).end(JSON.stringify(familyCreatedInfo));

    } catch (err) {
        console.log('get exception while creating the window family')
        let workitemStatus = {
            'Status': "Failed"
        };
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        res.status(500).end(err);
    }
});


router.delete('/da4revit/v1/families/:family_workitem_id', async(req, res, next) =>{

    const workitemId = req.params.family_workitem_id;
    try {
        const oauth = new OAuth(req.session);
        const oauth_client = oauth.get2LeggedClient();;
        const oauth_token = await oauth_client.authenticate();
        await cancelWrokitem(workitemId, oauth_token.access_token);

        // Remove the item from list if it's cancelled
        const workitem = workitemList.find( (item) => {
            return item.workitemId === workitemId;
        } )
        if( workitem === undefined ){
            console.log('the workitem is not in the list')
            return;
        }
        console.log('The workitem: ' + workitemId + ' is cancelled')
        let index = workitemList.indexOf(workitem);
        workitemList.splice(index, 1);

        let workitemStatus = {
            'WorkitemId': workitemId,
            'Status': "Cancelled"
        };
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        res.status(204).end();
    } catch (err) {
        res.status(500).end("error");
    }
})

router.get('/da4revit/v1/families/:family_workitem_id', async(req, res, next) => {
    const workitemId = (req.params.family_workitem_id);
    try {
        const oauth = new OAuth(req.session);
        const oauth_client = oauth.get2LeggedClient();;
        const oauth_token = await oauth_client.authenticate();        
        let workitemRes = await getWorkitemStatus(workitemId, oauth_token.access_token);
        res.status(200).end(JSON.stringify(workitemRes.body));
    } catch (err) {
        res.status(500).end("error");
    }
})


router.post('/da4revit/callback', async (req, res, next) => {
    // Best practice is to tell immediately that you got the call
    // so return the HTTP call and proceed with the business logic
    res.status(202).end();

    let workitemStatus = {
        'WorkitemId': req.body.id,
        'Status': "Success"
    };
    if (req.body.status === 'success') {
        const workitem = workitemList.find( (item) => {
            return item.workitemId === req.body.id;
        } )

        if( workitem === undefined ){
            console.log('The workitem: ' + req.body.id+ ' to callback is not in the item list')
            return;
        }
        let index = workitemList.indexOf(workitem);
        workitemStatus.Status = 'Success';
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        console.log("Post handle the workitem:  " + workitem.workitemId);        
        const type = workitem.createVersionData.data.type;
        try {
            let version = null;
            if(type === "versions"){
                const versions = new VersionsApi();
                version = await versions.postVersion(workitem.projectId, workitem.createVersionData, req.oauth_client, workitem.access_token_3Legged);
            }else{
                const items = new ItemsApi();
                version = await items.postItem(workitem.projectId, workitem.createVersionData, req.oauth_client, workitem.access_token_3Legged);
            }
            if( version === null || version.statusCode !== 201 ){ 
                console.log('Falied to create a new version of the file');
                workitemStatus.Status = 'Failed'
            }else{
                console.log('Successfully created a new version of the file');
                workitemStatus.Status = 'Completed';
            }
            global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);

        } catch (err) {
            console.log(err);
            workitemStatus.Status = 'Failed';
            global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        }
        finally{
            // Remove the workitem after it's done
            workitemList.splice(index, 1);
        }
    }else{
        // Report if not successful.
        workitemStatus.Status = 'Failed';
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        console.log(req.body);
    }
    return;
})



module.exports = router;
