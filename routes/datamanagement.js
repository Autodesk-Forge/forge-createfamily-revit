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
const { HubsApi, ProjectsApi, FoldersApi, ItemsApi } = require('forge-apis');

const { OAuth } = require('./common/oauth');

let router = express.Router();

router.get('/datamanagement', async (req, res) => {
    // The id querystring parameter contains what was selected on the UI tree, make sure it's valid
    const href = decodeURIComponent(req.query.id);
    if (href === '') {
        res.status(500).end();
        return;
    }

    // Get the access token
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    if (href === '#') {
        // If href is '#', it's the root tree node
        getHubs(oauth.getClient(), internalToken, res);
    } else {
        // Otherwise let's break it by '/'
        const params = href.split('/');
        const resourceName = params[params.length - 2];
        const resourceId = params[params.length - 1];
        switch (resourceName) {
            case 'hubs':
                getProjects(resourceId, oauth.getClient(), internalToken, res);
                break;
            case 'projects':
                // For a project, first we need the top/root folder
                const hubId = params[params.length - 3];
                getFolders(hubId, resourceId/*project_id*/, oauth.getClient(), internalToken, res);
                break;
            case 'folders':
                {
                    const projectId = params[params.length - 3];
                    getFolderContents(projectId, resourceId/*folder_id*/, oauth.getClient(), internalToken, res);
                    break;
                }
            case 'items':
                {
                    const projectId = params[params.length - 3];
                    getVersions(projectId, resourceId/*item_id*/, oauth.getClient(), internalToken, res);
                    break;
                }
        }
    }
});

// delete a folder
router.post('/datamanagement/folder/delete', async (req, res )=>{
    const href = decodeURIComponent(req.body.id);
    if (href === '' || href == null) {
        res.status(500).end();
        return;
    }

    const params = href.split('/');
    if(params.length < 3 ){
        res.status(500).end('info: the ');
        return;
    }
    const projectId = params[params.length-3];
    const folderId  = params[params.length-1];

    // Get the access token
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();

    var request = require("request");

    var options = {
        method: 'PATCH',
        url: 'https://developer.api.autodesk.com/data/v1/projects/' + projectId + '/folders/' + folderId,
        headers: {
            'Content-Type': 'application/vnd.api+json',
            Authorization: 'Bearer ' + internalToken.access_token
        },
        body: '{ "jsonapi": {"version": "1.0" },"data": {"type": "folders","id": "'+folderId+'","attributes": {"hidden":true}}}'
    };
    request(options, function (error, response, body) {
      if (error) {
        console.log(error);
        res.status(500).end('failed to delete the file');
        return;
      }else{
        // console.log(body);
        res.status(200).end('file is deleted');
      }
    });
})

// create a subfolder
router.post('/datamanagement/folder', async (req, res) =>{
    const href = decodeURIComponent(req.body.id);
    const folderName = decodeURIComponent(req.body.name);
    if (href === '' || folderName == '') {
        res.status(500).end();
        return;
    }

    if (href === '#') {
        res.status(500).end('not supported item');
        return;
    } 

    const params = href.split('/');
    if( params.length < 3){
        res.status(500).end('selected item id has problem');
        return;
    }

    const resourceName = params[params.length - 2];
    if (resourceName != 'folders') {
        res.status(500).end('not supported item');
        return;
    }

    const projectId = params[params.length - 3];
    const folderId  = params[params.length - 1];

    // create a new folder
    const folders = new FoldersApi();
    // Get the access token
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    
    // TBD: the parameter body type(CreateBody) is not defined yet, use raw json data as body for now
    const folderBody = {
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


      try{

        let newFolder = await folders.postFolder( projectId, folderBody, oauth.getClient(), internalToken );
        console.log(newFolder);
        if(newFolder == null || newFolder.statusCode != 201){
            console.log('failed to create a folder.');
            res.status(500).end('failed to create a folder.');
            return;
        }
        let folderInfo = {
            id: newFolder.body.links.self.href,
            type: newFolder.body.data.type
        }
        res.status(200).end(JSON.stringify(folderInfo));
      }catch(err){
        console.log('failed to create a folder.');
        res.status(500).end('failed to create a folder.');
      }
})

async function getHubs(oauthClient, credentials, res) {
    const hubs = new HubsApi();
    const data = await hubs.getHubs({}, oauthClient, credentials);
    res.json(data.body.data.map((hub) => {
        let hubType;
        switch (hub.attributes.extension.type) {
            case 'hubs:autodesk.core:Hub':
                hubType = 'hubs';
                break;
            case 'hubs:autodesk.a360:PersonalHub':
                hubType = 'personalHub';
                break;
            case 'hubs:autodesk.bim360:Account':
                hubType = 'bim360Hubs';
                break;
        }
        return createTreeNode(
            hub.links.self.href,
            hub.attributes.name,
            hubType,
            true
        );
    }));
}

async function getProjects(hubId, oauthClient, credentials, res) {
    const projects = new ProjectsApi();
    const data = await projects.getHubProjects(hubId, {}, oauthClient, credentials);
    res.json(data.body.data.map((project) => {
        let projectType = 'projects';
        switch (project.attributes.extension.type) {
            case 'projects:autodesk.core:Project':
                projectType = 'a360projects';
                break;
            case 'projects:autodesk.bim360:Project':
                projectType = 'bim360projects';
                break;
        }
        return createTreeNode(
            project.links.self.href,
            project.attributes.name,
            projectType,
            true
        );
    }));
}

async function getFolders(hubId, projectId, oauthClient, credentials, res) {
    const projects = new ProjectsApi();
    const folders = await projects.getProjectTopFolders(hubId, projectId, oauthClient, credentials);
    res.json(folders.body.data.map((item) => {
        return createTreeNode(
            item.links.self.href,
            item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName,
            item.type,
            true
        );
    }));
}

async function getFolderContents(projectId, folderId, oauthClient, credentials, res) {
    const folders = new FoldersApi();
    const contents = await folders.getFolderContents(projectId, folderId, {}, oauthClient, credentials);
    const treeNodes = contents.body.data.map((item) => {
        var name = (item.attributes.name == null ? item.attributes.displayName : item.attributes.name);
        if (name !== '') { // BIM 360 Items with no displayName also don't have storage, so not file to transfer
            return createTreeNode(
                item.links.self.href,
                name,
                item.type,
                true
            );
        } else {
            return null;
        }
    });
    res.json(treeNodes.filter(node => node !== null));
}

async function getVersions(projectId, itemId, oauthClient, credentials, res) {
    const items = new ItemsApi();
    const versions = await items.getItemVersions(projectId, itemId, {}, oauthClient, credentials);
    res.json(versions.body.data.map((version) => {
        const dateFormated = new Date(version.attributes.lastModifiedTime).toLocaleString();
        const versionst = version.id.match(/^(.*)\?version=(\d+)$/)[2];
        const viewerUrn = (version.relationships != null && version.relationships.derivatives != null ? version.relationships.derivatives.data.id : null);
        return createTreeNode(
            viewerUrn,
            decodeURI('v' + versionst + ': ' + dateFormated + ' by ' + version.attributes.lastModifiedUserName),
            (viewerUrn != null ? 'versions' : 'unsupported'),
            false
        );
    }));
}

// Format data for tree
function createTreeNode(_id, _text, _type, _children) {
    return { id: _id, text: _text, type: _type, children: _children };
}

module.exports = router;
