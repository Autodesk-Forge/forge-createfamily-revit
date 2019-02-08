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
    url: '/api/forge/oauth/v1/token',
    success: function (res) {
      // yes, it is signed in...
      $('#signOut').show();
      $('#autodeskSigninButton').hide();
      
      // add right panel
      $('#refreshHubsDestination').show();

      // prepare sign out
      $('#signOut').click(function () {
        $('#hiddenFrame').on('load', function (event) {
          location.href = '/api/forge/oauth/v1/signout';
        });
        $('#hiddenFrame').attr('src', 'https://accounts.autodesk.com/Authentication/LogOut');
        // learn more about this signout iframe at
        // https://forge.autodesk.com/blog/log-out-forge
      })

      // and refresh button
      $('#refreshHubsDestination').click(function () {
        $('#userHubsDestination').jstree(true).refresh();
      });

      // finally:
      prepareUserHubsTree();
      showUser();
    },
    error: function(err){
      $('#signOut').hide();
      $('#autodeskSigninButton').show();
    }
  });

  $('#autodeskSigninButton').click(function () {
    jQuery.ajax({
      url: '/api/forge/oauth/v1/url',
      success: function (url) {
        location.href = url;
      }
    });
  })

  $.getJSON("/api/forge/oauth/v1/clientid", function (res) {
    $("#ClientID").val(res.id);
    $("#provisionAccountSave").click(function () {
      $('#provisionAccountModal').modal('toggle');
      $('#userHubsDestination').jstree(true).refresh();
    });
  });  

  $('#createFamilyBtn').click(async function () {
    outputFolder  = $('#userHubsDestination').jstree(true).get_selected(true)[0];
    if(outputFolder == null || outputFolder.type != 'folders'){
      alert('Can not get the destinate folder, please make sure you select a folder to save the Family file');
      return;
    }
    updateStatus('started');

    // Save the current params first
    saveCurrentParams();

    const glassPaneMaterial = $('#glassPaneMaterialSelId option:selected').text()
    const sashMaterial      = $('#sashMaterialSelId option:selected').text()
    const windowFamilyName = ($('#windowFamilyNameId').val()=="")? "Double Hung.rfa": $('#windowFamilyNameId').val();
    const windowType =  $('input[name="windowStyle"]:checked ').val();

    // TBD: support different type of family, and multiple types in one family
    const params = { 
      FileName : windowFamilyName,    
      FamilyType : FamileyType.WINDOW,
      WindowParams:{
        WindowStyle: windowType,
        GlassPaneMaterial : glassPaneMaterial,
        SashMaterial : sashMaterial,
        Types : familyTypes.getAllTypes(),
      }
    };

    try {
      let res = await createFamily( params, outputFolder.id);
      console.log('The family is created');
      console.log(res);
      workingItem = res.workItemId;
      updateStatus(res.workItemStatus);
    } catch (err) {
      console.log('Failed to create the family');
      updateStatus('failed');
    }
  });
  
  $('#cancelBtn').click( async function () {
    if( workingItem != null){
      try{
        await cancelWorkitem(workingItem);
        console.log('The job is cancelled');
      }catch(err){
        console.log('Failed to cancel the job');
      }
    }
  });


  $('#queryFamilyBtn').click( async function () {
    if( workingItem != null){
      try{
        let res = await getWorkitemStatus(workingItem);
        console.log('The status of job is gotton');
        console.log(res);
      }catch(err){
        console.log('Failed to get the status of job');
      }
    }
  });


  $('#createNewType').click( async function(){
    // Save the params first
    saveCurrentParams();

    familyTypes.addNewType();
    refreshTypeList();
  })

  
  $('#typeNameId').focusout( function(){
    // Save the params first
    saveCurrentParams();
    refreshTypeList();
  })
  
  refreshTypeList();

});

const WindowType = {
  DOUBLEHUNG : 1,
  FIXED : 2,
  SLIDINGDOUBLE : 3
};


const FamileyType = {
  WINDOW : 1,
  DOOR   :2,
}


var workingItem = null;
var outputFolder = null;


// Manage the multiple family types
class FamilyTypes{
  constructor(){
    this.typeList = new Array();
    this.typeList.push({
      TypeName: 'NewType',
      WindowHeight : 4,
      WindowWidth : 2,
      WindowInset : 0.05,
      WindowSillHeight : 3,
    });
    this.typeIndex = 0;
  };

  getCurrentIndex(){
    return this.typeIndex;
  };

  setCurrentIndex( index ){
    if( index >= this.typeList.length || index < 0  ){
      console.log("the input index is not correct.");
      return;
    }
    this.typeIndex = index;
  };
  
  getCurrentType(){
    return this.typeList[this.typeIndex];
  };

  setCurrentType( data ){
    // Add more check here
    if(data == null){
      console.log("the input data is not valid.");
      return;
    }
    this.typeList[this.typeIndex] = data;
  }


  addNewType(){
    this.typeList.push({
      TypeName: 'NewType',
      WindowHeight : 4,
      WindowWidth : 2,
      WindowInset : 0.05,
      WindowSillHeight : 3,
    });

    this.typeIndex = this.typeList.length-1;
  }
  
  removeType( index ){
    if( index >= this.typeList.length || index < 0  ){
      console.log("the input index is not correct.");
      return;
    }

    this.typeList.splice(index, 1);
    this.typeIndex = 0;
  }

  getTypeByIndex( index ){
    if( index >= this.typeList.length || index < 0  ){
      console.log("the input index is not correct.");
      return null;
    }
    return this.typeList[index];
  }


  getAllTypes(){
    return this.typeList;
  }
};


var familyTypes = new FamilyTypes();

const SOCKET_TOPIC_WORKITEM = 'Workitem-Notification';

socketio = io();
socketio.on(SOCKET_TOPIC_WORKITEM, (data)=>{
  if(workingItem === null || data.WorkitemId !== workingItem)
    return;
    
  const status = data.Status.toLowerCase();
  updateStatus( status );
  
  // enable the create button and refresh the hubs when completed/failed/cancelled
  if(status == 'completed' || status == 'failed' || status == 'cancelled'){
    workingItem = null;
  }
  if(status == 'completed' && outputFolder != null){
    console.log('Family is completely created');
    console.log(data);
    let instance = $('#userHubsDestination').jstree(true);
    instance.refresh_node(outputFolder);
    outputFolder = null;
  }
})


function refreshFamilyParams( data ){
  if( data == null )
    return;

  $('#typeNameId')[0].value = data.TypeName;
  $('#windowHeightId')[0].value  = data.WindowHeight;
  $('#windowWidthId')[0].value = data.WindowWidth;
  $('#windowInsetId')[0].value = data.WindowInset;
  $('#windowSillHeightId')[0].value = data.WindowSillHeight;
}

function saveCurrentParams(){
  const typeName         = ($('#typeNameId').val()=="")? "New Type" : $('#typeNameId').val();
  const windowHeight     = ($('#windowHeightId').val()=="")? 4: $('#windowHeightId').val();
  const windowWidth      = ($('#windowWidthId').val()=="")? 2 : $('#windowWidthId').val();
  const windowInset      = ($('#windowInsetId').val()=="")? 0.05: $('#windowInsetId').val();
  const windowSillHeight = ($('#windowSillHeightId').val()=="")? 3: $('#windowSillHeightId').val();

  const familyParams = {
    TypeName: typeName,
    WindowHeight : windowHeight,
    WindowWidth : windowWidth,
    WindowInset : windowInset,
    WindowSillHeight : windowSillHeight,
  }

  familyTypes.setCurrentType(familyParams);
}

function refreshTypeList() {
  let familyTypesList = document.getElementById('familyTypes');
  let index = familyTypesList.childElementCount;
  while (index > 0) {
    familyTypesList.removeChild(familyTypesList.firstElementChild);
    index--;
  }

  const types = familyTypes.getAllTypes();
  let id = 0;
  types.forEach((item) => {
    let li = document.createElement('li')
    li.setAttribute('class', 'list-group-item');
    li.setAttribute( 'id', id.toString());
    li.textContent = item.TypeName;
    li.onclick = (e) => {
      if(e.target.tagName == "SPAN"){
        return;
      }
      // Save the current params
      saveCurrentParams();

      // Remove previous focus 
      let familyTypesList = document.getElementById('familyTypes');
      familyTypesList.children[familyTypes.getCurrentIndex()].setAttribute("class", "list-group-item");

      familyTypes.setCurrentIndex(parseInt(e.currentTarget.id));
      e.toElement.className += " list-group-item-danger";
      const familyParams = familyTypes.getCurrentType();
      refreshFamilyParams(familyParams)
    }

    let spanRemove = document.createElement('span')
    spanRemove.setAttribute('class', 'badge')
    spanRemove.onclick = (e) => {
      familyTypes.removeType( parseInt(e.currentTarget.parentNode.id) );
      refreshTypeList();
    };
    spanRemove.textContent = 'Remove';
    li.appendChild(spanRemove);

    familyTypesList.appendChild(li);
    id++;
  })

  familyTypesList.children[familyTypes.getCurrentIndex()].className += " list-group-item-danger";
  refreshFamilyParams(familyTypes.getCurrentType());
}

function updateStatus( status){
  let statusText = document.getElementById('statusText');
  let upgradeBtnElm = document.getElementById('createFamilyBtn');
  let cancelBtnElm = document.getElementById('cancelBtn');
  switch( status){
    case "started":
        setProgress(20);
        statusText.innerHTML = "<h4>Submiting the job...</h4>"
        // Disable Create and Cancel button
        upgradeBtnElm.disabled = true;
        cancelBtnElm.disabled = true;
        break;
    case "pending":
        setProgress(40);
        statusText.innerHTML = "<h4>Processing by Design Automation Server...</h4>"
        cancelBtnElm.disabled = false;
        break;
    case "success":
        setProgress(80);
        statusText.innerHTML = "<h4>Creating 1st version in BIM360...</h4>"
        break;
    case "completed":
        setProgress(100);
        statusText.innerHTML = "<h4>Family is Created Successfully in BIM360!</h4>"
        // Enable Create and Cancel button
        upgradeBtnElm.disabled = false;
        cancelBtnElm.disabled = false;
        break;
    case "failed":
        setProgress(0);
        statusText.innerHTML = "<h4>Failed to create the family:(</h4>"
        // Enable Create and Cancel button
        upgradeBtnElm.disabled = false;
        cancelBtnElm.disabled = false;
        break;
    case "cancelled":
        setProgress(0);
        statusText.innerHTML = "<h4>The Job is cancelled!</h4>"
        // Enable Create and Cancel button
        upgradeBtnElm.disabled = false;
        cancelBtnElm.disabled = false;
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



async function createFolder(node) {
  if (node == null) {
    console.log('selected node is not correct.');
    return;
  }

  const folderName = prompt("Please specify the folder name:");
  if (folderName == null || folderName == '')
    return;

  try {
    const res = await createNamedFolder(node, folderName);
    console.log( 'Folder is created.')
    console.log(res);
  } catch (err) {
    alert("Failed to create folder: " + folderName )
  }

  // refresh the node
  let instance = $('#userHubsDestination').jstree(true);
  let selectNode = instance.get_selected(true)[0];
  instance.refresh_node(selectNode);
}

/// Create Window Family
async function createFamily( params , targetFolder){
  let def = $.Deferred();

  const data = {
    Params : params,
    TargetFolder : targetFolder
  }

  jQuery.post({
    url: '/api/forge/da4revit/v1/families',
    contentType: 'application/json', // The data type was sent
    dataType: 'json', // The data type will be received
    data: JSON.stringify(data),
    success: function (res) {
      def.resolve(res);
    },
    error: function (err) {
      def.reject(err);
    }
  });
  return def.promise();
}

function deleteFolder(node){
  let def = $.Deferred();

  if (node == null) {
    console.log('selected node is not correct.');
    def.reject('selected node is not correct.');
  }

  $.ajax({
    url: '/api/forge/datamanagement/v1/folders/' + encodeURIComponent(node.id),
    type: "delete",
    dataType: "json",
    success: function (res) {
      def.resolve(res);
    },
    error: function(err){
      def.reject(err);
    }
  });

  return def.promise();
}



function createNamedFolder(node, folderName) {
  let def = $.Deferred();

  if (node == null || folderName == null || folderName == '') {
    console.log('parameters are not correct.');
    def.reject("parameters are not correct.");
  }

  jQuery.post({
    url: '/api/forge/datamanagement/v1/folders',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      'id': node.id,
      'name': folderName
    }),
    success: function (res) {
      def.resolve(res);
    },
    error: function (err) {
      def.reject(err);
    }
  });
  return def.promise();
}


function cancelWorkitem(workitemId) {
  let def = $.Deferred();
  if (workitemId === null || workitemId === '') {
    console.log('parameters are not correct.');
    def.reject("parameters are not correct.");
  }

  $.ajax({
    url: '/api/forge/da4revit/v1/families/' + encodeURIComponent(workitemId),
    type: "delete",
    // dataType: "json",
    // data: JSON.stringify({
    //   'workitemId': workitemId
    // }),
    success: function (res) {
      def.resolve(res);
    },
    error: function (err) {
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

  jQuery.get({
    url: '/api/forge/da4revit/v1/families/' + encodeURIComponent(workitemId),
    dataType: 'json',
    // data: {
    //   'workitemId': workitemId
    // },
    success: function (res) {
      def.resolve(res);
    },
    error: function (err) {
      def.reject(err);
    }
  });
  return def.promise();
}

function showUser() {
  jQuery.ajax({
    url: '/api/forge/user/v1/profile',
    success: function (profile) {
      var img = '<img src="' + profile.picture + '" height="20px">';
      $('#userInfo').html(img + profile.name);
    }
  });
}


function prepareUserHubsTree( ) {
  $(userHubsDestination).jstree({
    'core': {
      'themes': { "icons": true },
      'multiple': false,
      'data': {
        "url": '/api/forge/datamanagement/v1',
        "dataType": "json",
        'cache': false,
        'data': function (node) {
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
            try{
              const res = await deleteFolder(autodeskNode);
              console.log('Folder is deleted.');
              console.log(res);
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

