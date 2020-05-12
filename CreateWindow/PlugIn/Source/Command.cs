// (C) Copyright 2011 by Autodesk, Inc. 
//
// Permission to use, copy, modify, and distribute this software
// in object code form for any purpose and without fee is hereby
// granted, provided that the above copyright notice appears in
// all copies and that both that copyright notice and the limited
// warranty and restricted rights notice below appear in all
// supporting documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS. 
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK,
// INC. DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL
// BE UNINTERRUPTED OR ERROR FREE.
//
// Use, duplication, or disclosure by the U.S. Government is
// subject to restrictions set forth in FAR 52.227-19 (Commercial
// Computer Software - Restricted Rights) and DFAR 252.227-7013(c)
// (1)(ii)(Rights in Technical Data and Computer Software), as
// applicable.
//

using System;
using Autodesk.Revit.DB;
using Autodesk.Revit.ApplicationServices;
using DesignAutomationFramework;


namespace Autodesk.Forge.RevitIO.CreateWindow
{
    public class CreateWindowData
    {
        public Application Application { get; set; }
        public Document Document { get; set; }
    }

    [Autodesk.Revit.Attributes.Regeneration(Autodesk.Revit.Attributes.RegenerationOption.Manual)]
    [Autodesk.Revit.Attributes.Transaction(Autodesk.Revit.Attributes.TransactionMode.Manual)]
    public class CreateWindowApp : IExternalDBApplication
    {
        public ExternalDBApplicationResult OnStartup(ControlledApplication application)
        {
            DesignAutomationBridge.DesignAutomationReadyEvent += HandleDesignAutomationReadyEvent;
            return ExternalDBApplicationResult.Succeeded;
        }

        public void HandleDesignAutomationReadyEvent( object sender, DesignAutomationReadyEventArgs e)
        {
            e.Succeeded = true;
            e.Succeeded = CreateWindowFamily(e.DesignAutomationData);
        }


        protected bool CreateWindowFamily( DesignAutomationData data )
        {
            if (data == null)
                return false;

            Application app = data.RevitApp;
            if (app == null)
                return false;

            string modelPath = data.FilePath;
            if (String.IsNullOrWhiteSpace(modelPath))
                return false;

            Document doc = data.RevitDoc;
            if (doc == null)
                return false;

            CreateWindowData createWindowData = new CreateWindowData();
            createWindowData.Application = app;
            createWindowData.Document = doc;


            ////////////////////////////////////////////////////////////////
            if (!doc.IsFamilyDocument)
            {
                Console.WriteLine("It's not family document");
                return false;
            }else
            {
                if (null != doc.OwnerFamily && null != doc.OwnerFamily.FamilyCategory
                    && doc.OwnerFamily.FamilyCategory.Name != doc.Settings.Categories.get_Item(BuiltInCategory.OST_Windows).Name)
                // FamilyCategory.Name is not "Windows".
                {
                    Console.WriteLine("It's not windows family template");
                    return false;
                }
                WindowWizard wizard = new WindowWizard(createWindowData);
                return wizard.RunWizard();
            }
         }


        public ExternalDBApplicationResult OnShutdown(ControlledApplication application)
        {

            return ExternalDBApplicationResult.Succeeded;
        }
    };

}
