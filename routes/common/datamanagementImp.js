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


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function createFolderBody(folderName, folderId) {

    // TBD: the parameter body type(CreateBody) is not defined yet, use raw json data as body for now
    return folderBody = {
        "jsonapi": {
            "version": "1.0"
        },
        "data": {
            "type": "folders",
            "attributes": {
                "name": folderName,
                "extension": {
                    "type": "folders:autodesk.bim360:Folder",
                    "version": "1.0"
                }
            },
            "relationships": {
                "parent": {
                    "data": {
                        "type": "folders",
                        "id": folderId
                    }
                }
            }
        }
    }
}


///////////////////////////////////////////////////////////////////////
///
///
///////////////////////////////////////////////////////////////////////
function deleteFolder(projectId, folderId, access_token) {

    return new Promise(function (resolve, reject) {

        var options = {
            method: 'PATCH',
            url: 'https://developer.api.autodesk.com/data/v1/projects/' + projectId + '/folders/' + folderId,
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Authorization: 'Bearer ' + access_token
            },
            body: '{ "jsonapi": {"version": "1.0" },"data": {"type": "folders","id": "' + folderId + '","attributes": {"hidden":true}}}'
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


module.exports = {
    createFolderBody, 
    deleteFolder
}