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
const request = require("request");

const {
    ProjectsApi, 
    ItemsApi,
    VersionsApi,
    StorageRelationshipsTarget,
    CreateStorageDataRelationships,
    CreateStorageDataAttributes,
    CreateStorageData,
    CreateStorage,
    StorageRelationshipsTargetData
} = require('forge-apis');

const { OAuth } = require('./common/oauth');
const { designAutomation }= require('../config');

const AUTODESK_HUB_BUCKET_KEY = 'wip.dm.prod';
const SOCKET_TOPIC_WORKITEM = 'Workitem-Notification';

let router = express.Router();

var workitemList = [];


// Middleware for obtaining a token for each request.
router.use(async (req, res, next) => {
    // Get the access token
    const oauth = new OAuth(req.session);
    let credentials = await oauth.getInternalToken();
    let oauth_client = oauth.getClient();

    req.oauth_client = oauth_client;
    req.oauth_token = credentials;
    next();
});



router.post('/da4revit/family/window', async(req, res, next)=>{
    const params = req.body.Params;
    const destinateFolderUrl = req.body.TargetFolder;

    // Get all the parameters from client
    if (params == '' || destinateFolderUrl == '') {
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
    if (destinateFolderType != 'folders') {
        console.log('info: not supported item');
        res.status(400).end('not supported item');
        return;
    }

    const destinateFolderId = destinateFolderParams[destinateFolderParams.length - 1];
    const destinateProjectId = destinateFolderParams[destinateFolderParams.length - 3];

    try {
        ////////////////////////////////////////////////////////////////////////////////
        // the signed storage of the window family template
        // const inputUrl = 'https://developer.api.autodesk.com/oss/v2/signedresources/7ec8d102-d991-40f3-abdd-5aeafe072020?region=US';
        const inputUrl = 'https://developer.api.autodesk.com/oss/v2/buckets/revitiosample/objects/windowNewFamily.rft';
        
        ////////////////////////////////////////////////////////////////////////////////
        // create a new storage for the ouput item version
        const storageInfo = await getNewCreatedStorageInfo(destinateProjectId, destinateFolderId, params.FileName, req.oauth_client, req.oauth_token);
        if (storageInfo == null) {
            console.log('error: failed to create the storage');
            res.status(500).end('failed to create the storage');
            return;
        }
        const outputUrl = storageInfo.StorageUrl;
        console.log('output url for DA4Revit: ' + outputUrl);

        const createFirstVersionBody = createBodyOfPostItem(params.FileName, destinateFolderId, storageInfo.StorageId, 'items:autodesk.bim360:File', 'versions:autodesk.bim360:File')
        if (createFirstVersionBody == null) {
            console.log('failed to create body of Post Item');
            res.status(500).end('failed to create body of Post Item');
            return;
        }
        
        ////////////////////////////////////////////////////////////////////////////////
        // use 2 legged token for design automation
        const oauth = new OAuth(req.session);
        const oauth_client = oauth.get2LeggedClient();;
        const oauth_token = await oauth_client.authenticate();    
        let familyCreatedRes = await createWindowFamily(inputUrl, params, outputUrl, destinateProjectId, createFirstVersionBody, req.oauth_token, oauth_token);
        if (familyCreatedRes == null || familyCreatedRes.statusCode != 200) {
            console.log('failed to create the revit family file');
            res.status(500).end('failed to create the revit family file');
            return;
        }
        const familyCreatedInfo = {
            "fileName": params.FileName,
            "workItemId": familyCreatedRes.body.id,
            "workItemStatus": familyCreatedRes.body.status
        };
        res.status(200).end(JSON.stringify(familyCreatedInfo));

    } catch (err) {
        console.log('get exception while creating the window family')
        let workitemStatus = {
            'Status': "Failed"
        };
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        res.status(500).end(err);
    }
});


router.post('/da4revit/workitem/cancel', async(req, res, next) =>{

    const workitemId = decodeURIComponent(req.body.workitemId);
    try {
        const oauth = new OAuth(req.session);
        const oauth_client = oauth.get2LeggedClient();;
        const oauth_token = await oauth_client.authenticate();
        await cancelWrokitem(workitemId, oauth_token.access_token);
        let workitemStatus = {
            'WorkitemId': workitemId,
            'Status': "Cancelled"
        };
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);
        res.status(200).end(JSON.stringify(workitemStatus));
    } catch (err) {
        res.status(500).end("error");
    }
})

router.post('/da4revit/workitem/query', async(req, res, next) => {
    const workitemId = decodeURIComponent(req.body.workitemId);
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
    let workitemStatus = {
        'WorkitemId': req.body.id,
        'Status': "Success"
    };
    if (req.body.status == 'success') {
        const workitem = workitemList.find( (item) => {
            return item.workitemId == req.body.id;
        } )

        if( workitem == undefined ){
            console.log('the workitem is not in the list')
            return;
        }
        let index = workitemList.indexOf(workitem);
        workitemStatus.Status = 'Success';
        global.socketio.emit(SOCKET_TOPIC_WORKITEM, workitemStatus);

        console.log("check the workitem");
        console.log(workitem);
        
        const type = workitem.createVersionData.data.type;
        try {
            let version = null;
            if(type == "versions"){
                const versions = new VersionsApi();
                version = await versions.postVersion(workitem.projectId, workitem.createVersionData, req.oauth_client, workitem.access_token_3Legged);
            }else{
                const items = new ItemsApi();
                version = await items.postItem(workitem.projectId, workitem.createVersionData, req.oauth_client, workitem.access_token_3Legged);
            }
            if( version == null || version.statusCode != 201 ){ 
                console.log('falied to create a new version of the file');
                workitemStatus.Status = 'Failed'
            }else{
                console.log('successfully created a new version of the file');
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

function getWorkitemStatus(workItemId, access_token) {

    return new Promise(function (resolve, reject) {

        var request = require("request");

        var options = {
            method: 'GET',
            url: 'https://developer.api.autodesk.com/da/us-east/v3/workitems/' + workItemId,
            headers: {
                Authorization: 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                reject(err);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    });
}


function cancelWrokitem(workItemId, access_token) {

    return new Promise(function (resolve, reject) {

        var request = require("request");

        var options = {
            method: 'DELETE',
            url: 'https://developer.api.autodesk.com/da/us-east/v3/workitems/' + workItemId,
            headers: {
                Authorization: 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                reject(err);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    });
}




var createBodyOfPostStorage = function (folderId, fileName) {
    // create a new storage for the ouput item version
    let createStorage = new CreateStorage();
    let storageRelationshipsTargetData = new StorageRelationshipsTargetData("folders", folderId);
    let storageRelationshipsTarget = new StorageRelationshipsTarget;
    let createStorageDataRelationships = new CreateStorageDataRelationships();
    let createStorageData = new CreateStorageData();
    let createStorageDataAttributes = new CreateStorageDataAttributes();

    createStorageDataAttributes.name = fileName;
    storageRelationshipsTarget.data = storageRelationshipsTargetData;
    createStorageDataRelationships.target = storageRelationshipsTarget;
    createStorageData.relationships = createStorageDataRelationships;
    createStorageData.type = 'objects';
    createStorageData.attributes = createStorageDataAttributes;
    createStorage.data = createStorageData;
    
    return createStorage;
}


var createBodyOfPostItem = function( fileName, folderId, storageId, itemType, versionType){
    const body = 
    {
        "jsonapi":{
            "version":"1.0"
        },
        "data":{
            "type":"items",
            "attributes":{
                "name":fileName,
                "extension":{
                    "type":itemType,
                    "version":"1.0"
                }
            },
            "relationships":{
                "tip":{
                    "data":{
                        "type":"versions",
                        "id":"1"
                    }
                },
                "parent":{
                    "data":{
                        "type":"folders",
                        "id":folderId
                    }
                }
            }
        },
        "included":[
            {
                "type":"versions",
                "id":"1",
                "attributes":{
                    "name":fileName,
                    "extension":{
                        "type":versionType,
                        "version":"1.0"
                    }
                },
                "relationships":{
                    "storage":{
                        "data":{
                            "type":"objects",
                            "id":storageId
                        }
                    }
                }
            }
        ]
    };
    return body;
}

var getNewCreatedStorageInfo = async function (projectId, folderId, fileName, oauth_client, oauth_token) {

    // create body for Post Storage request
    let createStorageBody = createBodyOfPostStorage(folderId, fileName);

    const project = new ProjectsApi();
    let storage = await project.postStorage(projectId, createStorageBody, oauth_client, oauth_token);
    if (storage == null || storage.statusCode != 201) {
        console.log('failed to create a storage.');
        return null;
    }

    // setup the url of the new storage
    const strList = storage.body.data.id.split('/');
    if (strList.length != 2) {
        console.log('storage id is not correct');
        return null;
    }
    const storageUrl = "https://developer.api.autodesk.com/oss/v2/buckets/" + AUTODESK_HUB_BUCKET_KEY + "/objects/" + strList[1];
    return {
        "StorageId": storage.body.data.id,
        "StorageUrl": storageUrl
    };
}



var createWindowFamily = function (inputUrl, windowParams, outputUrl, projectId, createVersionData, access_token_3Legged, access_token_2Legged) {

    return new Promise(function (resolve, reject) {

        const workitemBody = {

                activityId: 'revitiosample.CreateDoubleHungWindowFamilyActivity+test',
                arguments: {
                    templateFile: {
                        url: inputUrl,
                        Headers: {
                            Authorization: 'Bearer ' + access_token_2Legged.access_token
                        },
                    },
                    windowParams: { 
                        url: "data:application/json,"+ JSON.stringify(windowParams)
                     },

                    resultFamily: {
                        verb: 'put',
                        url: outputUrl,
                        Headers: {
                            Authorization: 'Bearer ' + access_token_3Legged.access_token
                        },
                    },
                    onComplete: {
                        verb: "post",
                        url: designAutomation.callback_Url
                    }
                }
        };    
        var options = {
            method: 'POST',
            url: 'https://developer.api.autodesk.com/da/us-east/v3/workitems',
            headers: {
                Authorization: 'Bearer ' + access_token_2Legged.access_token,
                'Content-Type': 'application/json'
            },
            body: workitemBody,
            json: true
        };

        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                const workitemId = resp.id;
                console.log(workitemId);

                workitemList.push({
                    workitemId: workitemId,
                    projectId: projectId,
                    createVersionData: createVersionData,
                    access_token_3Legged: access_token_3Legged
                })

                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    })
}







module.exports = router;
