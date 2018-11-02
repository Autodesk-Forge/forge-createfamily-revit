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

$(document).ready(function () {
  // first, check if current visitor is signed in
  jQuery.ajax({
    url: '/api/forge/oauth/token',
    success: function (res) {
      // yes, it is signed in...
      $('#signOut').show();
      $('#autodeskSigninButton').hide();
      
      // add right panel
      $('#refreshHubsRight').show();

      // prepare sign out
      $('#signOut').click(function () {
        $('#hiddenFrame').on('load', function (event) {
          location.href = '/api/forge/oauth/signout';
        });
        $('#hiddenFrame').attr('src', 'https://accounts.autodesk.com/Authentication/LogOut');
        // learn more about this signout iframe at
        // https://forge.autodesk.com/blog/log-out-forge

        $('#signOut').hide();
        $('#autodeskSigninButton').show();
      })

      // and refresh button
      $('#refreshHubsRight').click(function () {
        $('#userHubsDestination').jstree(true).refresh();
      });

      // finally:
      prepareUserHubsTree();
      showUser();
    }
  });

  $('#autodeskSigninButton').click(function () {
    jQuery.ajax({
      url: '/api/forge/oauth/url',
      success: function (url) {
        location.href = url;
      }
    });
  })


  $('#createFamilyBtn').click(async function () {

    destinatedNode  = $('#userHubsDestination').jstree(true).get_selected(true)[0];
    if(destinatedNode == null || destinatedNode.type != 'folders'){
      alert('Can not get the destinate folder, please make sure you select a folder to save the Family file');
      return;
    }

    updateProgressBar('started');

    const typeName         = ($('#typeNameId').val()=="")? "New Type" : $('#typeNameId').val();
    const windowHeight     = ($('#windowHeightId').val()=="")? 4: $('#windowHeightId').val();
    const windowWidth      = ($('#windowWidthId').val()=="")? 2 : $('#windowWidthId').val();
    const windowInset      = ($('#windowInsetId').val()=="")? 0.05: $('#windowInsetId').val();
    const windowSillHeight = ($('#windowSillHeightId').val()=="")? 3: $('#windowSillHeightId').val();


    const glassPaneMaterial = $('#glassPaneMaterialSelId option:selected').text()
    const sashMaterial      = $('#sashMaterialSelId option:selected').text()


    const windowFamilyName = ($('#windowFamilyNameId').val()=="")? "Double Hung.rfa": $('#windowFamilyNameId').val();




    const params = { 
      TypeName: typeName,
      WindowHeight : windowHeight,
      WindowWidth : windowWidth,
      WindowInset : windowInset,
      WindowSillHeight : windowSillHeight,
      GlassPaneMaterial : glassPaneMaterial,
      SashMaterial : sashMaterial,
      FileName : windowFamilyName,    
    };

    // Disable the upgrade button    
    let upgradeBtnElm = document.getElementById('createFamilyBtn');
    upgradeBtnElm.disabled = true;

    try {
      let res = await createWindowFamily(WindowType.DOUBLEHUNG, params, destinatedNode.id);
      workingItem = res.workItemId;
      updateProgressBar(res.workItemStatus);
    } catch (err) {
      updateProgressBar('failed');

    }
  });
  
  $('#cancelBtn').click(function () {
  
  });

  
});

const WindowType = {
  DOUBLEHUNG : 1,
  FIXED : 2,
  SLIDINGDOUBLE : 3
};

var workingItem = null;
//replace with your suitable topic names 
const SOCKET_TOPIC_WORKITEM          = 'Workitem-Notification';

//replace with your own website
const baseurl = 'http://localhost:3000';

socketio = io.connect(baseurl);
socketio.on(SOCKET_TOPIC_WORKITEM, async (data)=>{
  console.log(data);
  updateProgressBar( data.Status.toLowerCase());
  let upgradeBtnElm = document.getElementById('createFamilyBtn');
  upgradeBtnElm.disabled = false;
  workingItem = null;
})


function updateProgressBar( status){
  let statusText = document.getElementById('statusText');
  switch( status){
    case "started":
        setProgress(20);
        statusText.innerHTML = "<h4>Submiting the job...</h4>"
        break;
    case "pending":
        setProgress(40);
        statusText.innerHTML = "<h4>Processing by Design Automation Server...</h4>"
        break;
    case "success":
        setProgress(80);
        statusText.innerHTML = "<h4>Creating 1st version in BIM360...</h4>"
        break;
    case "completed":
        setProgress(100);
        statusText.innerHTML = "<h4>Family is Created Successfully in BIM360!</h4>"
        break;
    case "failed":
        setProgress(0);
        statusText.innerHTML = "<h4>Failed to create the family:(</h4>"
        break;
    case "cancelled":
        setProgress(0);
        statusText.innerHTML = "<h4>The Job is cancelled!</h4>"
        break;
  }
}


function setProgress( percent ){
  let progressBar = document.getElementById('familyCreationProgressBar');
  progressBar.style = "width: "+ percent + "%;";
  if( percent == 100 ){
    progressBar.parentElement.className = "progress progress-striped"
  }else{
    progressBar.parentElement.className = "progress progress-striped active"

  }
}

/// Create Window Family
async function createWindowFamily( windowType, params , targetFolder){
  let def = $.Deferred();

  if (windowType != WindowType.DOUBLEHUNG) {
    def.reject('not supported window type.');
    return def.promise();
  }

  const data = {
    Params : params,
    TargetFolder : targetFolder
  }

  jQuery.post({
    url: '/api/forge/da4revit/family/window',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (res) {
      def.resolve(JSON.parse(res));
    },
    error: function (err) {
      def.reject(err);
    }
  });
  return def.promise();
}

function prepareUserHubsTree( ) {
  $(userHubsDestination).jstree({
    'core': {
      'themes': { "icons": true },
      'multiple': false,
      'data': {
        "url": '/api/forge/datamanagement',
        "dataType": "json",
        'cache': false,
        'data': function (node) {
          // $(userHubs).jstree(true).toggle_node(node);
          return { "id": node.id };
        }
      }
    },
    'types': {
      'default': {
        'icon': 'glyphicon glyphicon-question-sign'
      },
      '#': {
        'icon': 'glyphicon glyphicon-user'
      },
      'hubs': {
        'icon': 'https://github.com/Autodesk-Forge/bim360appstore-data.management-nodejs-transfer.storage/raw/master/www/img/a360hub.png'
      },
      'personalHub': {
        'icon': 'https://github.com/Autodesk-Forge/bim360appstore-data.management-nodejs-transfer.storage/raw/master/www/img/a360hub.png'
      },
      'bim360Hubs': {
        'icon': 'https://github.com/Autodesk-Forge/bim360appstore-data.management-nodejs-transfer.storage/raw/master/www/img/bim360hub.png'
      },
      'bim360projects': {
        'icon': 'https://github.com/Autodesk-Forge/bim360appstore-data.management-nodejs-transfer.storage/raw/master/www/img/bim360project.png'
      },
      'a360projects': {
        'icon': 'https://github.com/Autodesk-Forge/bim360appstore-data.management-nodejs-transfer.storage/raw/master/www/img/a360project.png'
      },
      'items': {
        'icon': 'glyphicon glyphicon-file'
      },
      'folders': {
        'icon': 'glyphicon glyphicon-folder-open'
      },
      'versions': {
        'icon': 'glyphicon glyphicon-time'
      },
      'unsupported': {
        'icon': 'glyphicon glyphicon-ban-circle'
      }
    },
    "plugins": ["types", "state", "sort", "contextmenu"],
    contextmenu: { items:  autodeskCustomMenuRight},
    "state": { "key": "autodeskHubs" }// key restore tree state
  }).bind("activate_node.jstree", function (evt, data) {
    // if (data != null && data.node != null && data.node.type == 'versions') {
    //   $("#forgeViewer").empty();
    //   var urn = data.node.id;
    //   launchViewer(urn);
    // }
  });
}



function autodeskCustomMenuRight(autodeskNode) {
  var items;

  switch (autodeskNode.type) {
    case "folders":
      items = {
        createFolder: {
          label: "Create folder",
          action: function () {
            createFolder(autodeskNode);
          },
          icon: 'glyphicon glyphicon-folder-open'
        },
        deleteFolder: {
          label: "Delete folder",
          action: async function () {
            // var treeNode = $('#userHubs').jstree(true).get_selected(true)[0];
            try{
              await deleteFolder(autodeskNode);
              // refresh the parent node
              let instance = $('#userHubsDestination').jstree(true);
              selectNode = instance.get_selected(true)[0];
              parentNode = instance.get_parent(selectNode);
              instance.refresh_node(parentNode);

            }catch(err){
              alert("Failed to delete folder: " + autodeskNode.text )
            }
          },
          icon: 'glyphicon glyphicon-remove'
        }       
      };
      break;
  }

  return items;
}


function deleteFolder(node){
  let def = $.Deferred();

  if (node == null) {
    console.log('selected node is not correct.');
    def.reject('selected node is not correct.');
  }

  jQuery.post({
    url: '/api/forge/datamanagement/folder/delete',
    contentType: 'application/json',
    data: JSON.stringify({ 'id': node.id}),
    success: function (res) {
      console.log('folder is deleted.')
      def.resolve('folder is deleted');
    },
    error: function(err){
      def.reject(err);
    }
  });

  return def.promise();
}


async function createFolder(node) {
  if (node == null) {
    console.log('selected node is not correct.');
    return;
  }

  const folderName = prompt("Please specify the folder name:");
  if (folderName == null || folderName == '')
    return;

  try {
    await createNamedFolder(node, folderName);
  } catch (err) {
    alert("Failed to create folder: " + folderName )
  }

  // refresh the node
  let instance = $('#userHubsDestination').jstree(true);
  let selectNode = instance.get_selected(true)[0];
  instance.refresh_node(selectNode);
}

function createNamedFolder(node, folderName) {

  let def = $.Deferred();

  if (node == null || folderName == null || folderName == '') {
    console.log('parameters are not correct.');
    def.reject("parameters are not correct.");
  }

  jQuery.post({
    url: '/api/forge/datamanagement/folder',
    contentType: 'application/json',
    data: JSON.stringify({
      'id': node.id,
      'name': folderName
    }),
    success: function (res) {
      console.log(res)
      def.resolve(JSON.parse(res));
    },
    error: function (err) {
      console.log(err)
      def.reject(err);
    }
  });
  return def.promise();
}

function cancelWorkitem( workitemId ){

  let def = $.Deferred();

  if(workitemId == null || workitemId == ''){
    console.log('parameters are not correct.');
    def.reject("parameters are not correct.");  
  }

  jQuery.post({
    url: '/api/forge/da4revit/workitem/cancel',
    contentType: 'application/json',
    data: JSON.stringify({
      'workitemId': workitemId
    }),
    success: function (res) {
      console.log(res)
      def.resolve(JSON.parse(res));
    },
    error: function (err) {
      console.log(err)
      def.reject(err);
    }
  });
  return def.promise();
}

function getWorkitemStatus( workitemId ){
  let def = $.Deferred();

  if(workitemId == null || workitemId == ''){
    console.log('parameters are not correct.');
    def.reject("parameters are not correct.");  
  }

  jQuery.post({
    url: '/api/forge/da4revit/workitem/query',
    contentType: 'application/json',
    data: JSON.stringify({
      'workitemId': workitemId
    }),
    success: function (res) {
      console.log(res)
      def.resolve(JSON.parse(res));
    },
    error: function (err) {
      console.log(err)
      def.reject(err);
    }
  });
  return def.promise();
}


function showUser() {
  jQuery.ajax({
    url: '/api/forge/user/profile',
    success: function (profile) {
      var img = '<img src="' + profile.picture + '" height="20px">';
      $('#userInfo').html(img + profile.name);
    }
  });
}
