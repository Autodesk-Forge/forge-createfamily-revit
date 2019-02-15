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

const request = require("request");

const { designAutomation }= require('../../config');

const {
    ProjectsApi, 
    StorageRelationshipsTarget,
    CreateStorageDataRelationships,
    CreateStorageDataAttributes,
    CreateStorageData,
    CreateStorage,
    StorageRelationshipsTargetData
} = require('forge-apis');


const AUTODESK_HUB_BUCKET_KEY = 'wip.dm.prod';
var workitemList = [];


function getWorkitemStatus(workItemId, access_token) {

    return new Promise(function (resolve, reject) {

        var options = {
            method: 'GET',
            url: designAutomation.revit_IO_Endpoint +'workitems/' + workItemId,
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

        var options = {
            method: 'DELETE',
            url:  designAutomation.revit_IO_Endpoint + 'workitems/' + workItemId,
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




function createBodyOfPostStorage(folderId, fileName) {
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


function createBodyOfPostItem( fileName, folderId, storageId, itemType, versionType){
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

async function getNewCreatedStorageInfo(projectId, folderId, fileName, oauth_client, oauth_token) {

    // create body for Post Storage request
    let createStorageBody = createBodyOfPostStorage(folderId, fileName);

    const project = new ProjectsApi();
    let storage = await project.postStorage(projectId, createStorageBody, oauth_client, oauth_token);
    if (storage === null || storage.statusCode !== 201) {
        console.log('failed to create a storage.');
        return null;
    }

    // setup the url of the new storage
    const strList = storage.body.data.id.split('/');
    if (strList.length !== 2) {
        console.log('storage id is not correct');
        return null;
    }
    const storageUrl = "https://developer.api.autodesk.com/oss/v2/buckets/" + AUTODESK_HUB_BUCKET_KEY + "/objects/" + strList[1];
    return {
        "StorageId": storage.body.data.id,
        "StorageUrl": storageUrl
    };
}



function createWindowFamily(inputUrl, windowParams, outputUrl, projectId, createVersionData, access_token_3Legged, access_token_2Legged) {

    return new Promise(function (resolve, reject) {

        const workitemBody = {

                activityId: designAutomation.revit_IO_Nick_Name + '.'+designAutomation.revit_IO_Activity_Name,
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
                        url: designAutomation.revit_IO_WebHook_Url
                    }
                }
        };    
        var options = {
            method: 'POST',
            url: designAutomation.revit_IO_Endpoint+'workitems',
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
                workitemList.push({
                    workitemId: resp.id,
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

module.exports = {
    getNewCreatedStorageInfo,
    createBodyOfPostItem,
    createWindowFamily,
    cancelWrokitem,
    getWorkitemStatus,
    workitemList

};