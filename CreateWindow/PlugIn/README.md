# Create Window Family Addin

# Description

This sample demostrated how to migrate the Revit WindowWizard Plugin to be used within AppBundle of Design Automation for Revit.

# Migration Steps
Here is the main steps to migrate the Revit addin, before read the detail steps, please make sure you go through the official [Convert Addin Doc](https://forge.autodesk.com/en/docs/design-automation/v3/tutorials/revit/step1-convert-addin/) and understand the framework.

## Before we start: 
- Build the WindowWizard project under \\Revit 2019 SDK\Samples\FamilyCreation\WindowWizard\CS\, load it into Revit to make sure it works good.

## Get rid of all UI Stuff: 
- Remove References to all the UI related assembly, including RevitAPIUI.dll, System.Windows.dll;
- Check all the .cs file, and remove all the reference to Autodesk.Revit.UI and System.Windows.Forms;
- Remove WizardUI.cs file, which is the main Window UI part to collect all the input parameter, we will get all these input parameter from a JSON file instead later.

- Create a new class **CreateWindowData** in namespace **Revit.SDK.Samples.WindowWizard.CS** to replace **Autodesk.Revit.UI.ExternalCommandData**, the code should look as follow, and then replace all the usage of ExternalCommandData to CreateWindowData.

 ```   
    using Autodesk.Revit.ApplicationServices;
    public class CreateWindowData
    {
        public Application Application { get; set; }
        public Document Document { get; set; }
    }
```
- In **Utility.cs**, use Application to replace UIApplication, and use **doc** directly as the parameter in FilteredElementCollector(). 
- In **DoubleHungWinCreation.cs**, use Application to replace UIApplication, and update the all the referenced place.

## Let's make it work as AppBundle of Design Automation for Revit
- Add reference to DesignAutomationBridge.dll(please download at [Nuget](https://www.nuget.org/packages/Autodesk.Forge.DesignAutomation)), remove the command class, create the new class **CreateWindowApp** from **IExternalDBApplication**, the code should look like: 
```   
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
```


- Since the UI is removed, we will use JSON file instead as input of parameters, create 2 new classes **TypeDAParams** and **WindowsDAParams** to handle the input JSON format parameter as follow(Make sure to install **Newtonsoft.Json** by NuGet Package Manager first):
```
        using System;
        using System.IO;
        using Newtonsoft.Json;

        namespace Autodesk.Forge.RevitIO.CreateWindow
        {

            internal class TypeDAParams
            {
                public String TypeName { get; set; } = "New Type";
                public Double WindowHeight { get; set; } = 4;
                public Double WindowWidth { get; set; } = 2;
                public Double WindowInset { get; set; } = 0.05;
                public Double WindowSillHeight { get; set; } = 3;

            }

            internal class WindowsDAParams
            {
                public TypeDAParams[] Types { get; set; } = { new TypeDAParams() };

                public String WindowStyle { get; set; } = "DoubleHungWindow";
                public String GlassPaneMaterial { get; set; } = "Default";
                public String SashMaterial { get; set; } = "Default";
                public String WindowFamilyName { get; set; } = "Double Hung.rfa";

                static public WindowsDAParams Parse(string jsonPath)
                {
                    try
                    {
                        if (!File.Exists(jsonPath))
                            return new WindowsDAParams();

                        string jsonContents = File.ReadAllText(jsonPath);
                        return JsonConvert.DeserializeObject<WindowsDAParams>(jsonContents);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Exception when parsing json file: " + ex);
                        return null;
                    }
                }
            }
        }
```

- Update the method **WindowWizard.RunWizard()** as follow for parameter collection:
```
        public bool RunWizard()
        {
            // For Window Family Creation workItem
            WindowsDAParams windowFamilyParams;
            windowFamilyParams = WindowsDAParams.Parse("WindowParams.json");

            m_para = new WizardParameter();
            m_para.m_template = windowFamilyParams.WindowStyle;

            if (m_para.m_template.Equals("DoubleHungWindow", StringComparison.CurrentCultureIgnoreCase))
            {
                m_winCreator = new DoubleHungWinCreation(m_para, m_commandData);
                foreach (TypeDAParams type in windowFamilyParams.Types)
                {
                    DoubleHungWinPara dbhungWinPara = new DoubleHungWinPara(m_para.Validator.IsMetric);
                    dbhungWinPara.Height = type.WindowHeight;
                    dbhungWinPara.Width = type.WindowWidth;
                    dbhungWinPara.Inset = type.WindowInset;
                    dbhungWinPara.SillHeight = type.WindowSillHeight;
                    dbhungWinPara.Type = type.TypeName;
                    m_para.CurrentPara = dbhungWinPara;
                    if (!m_para.WinParaTab.Contains(dbhungWinPara.Type))
                    {
                        m_para.WinParaTab.Add(dbhungWinPara.Type, dbhungWinPara);
                    }
                    else
                    {
                        m_para.WinParaTab[dbhungWinPara.Type] = dbhungWinPara;
                    }
                }
                m_para.GlassMat = windowFamilyParams.GlassPaneMaterial;
                m_para.SashMat = windowFamilyParams.SashMaterial;
            }
            return Creation();
        }
```

- set the window family name as follow to the constructor of class **DoubleHungWinCreation**:
```
            para.PathName = "WindowFamily.rfa";
```

- To make the new created family file could be previewed, modify the code to create the thumbnail for the family as follow:       
```
        if (File.Exists(m_para.PathName))
            File.Delete(m_para.PathName);

        SaveAsOptions saveOpts = new SaveAsOptions();
        // Check for permanent preview view
        if (m_document.GetDocumentPreviewSettings().PreviewViewId.Equals(ElementId.InvalidElementId))
        {
            // use 3D view as preview
            View view = new FilteredElementCollector(m_document)
                .OfClass(typeof(View))
                .Cast<View>()
                .Where(vw =>
                    vw.ViewType == ViewType.ThreeD && !vw.IsTemplate
                )
                .FirstOrDefault();

            if (view != null)
            {
                saveOpts.PreviewViewId = view.Id;
            }
        }

        m_document.SaveAs(m_para.PathName, saveOpts);
```
## Last Step
- Update the addin file, change "AddIn Type" to "DBApplication", and add **Name** node, the file should looks as follow:
```
        <?xml version="1.0" encoding="utf-8"?>
        <RevitAddIns>
        <AddIn Type="DBApplication">
            <Name>Create Window Family App</Name>
            <Assembly>WindowWizard.dll</Assembly>
            <ClientId>c903482e-5d62-4323-8908-f6acfc66c767</ClientId>
            <FullClassName>Revit.SDK.Samples.WindowWizard.CS.CreateWindowApp</FullClassName>
            <Text>WindowWizard</Text>
            <Description>This command is to create window family via wizard</Description>
            <VisibilityMode>AlwaysVisible</VisibilityMode>
            <VendorId>ADSK</VendorId>
            <VendorDescription>Autodesk, www.autodesk.com</VendorDescription>
        </AddIn>
        </RevitAddIns>
```

## Let's Try Now
- Until now, you could test your addin locally to make sure it creates double hung window as expected. 

## Extend to support more WindowFamily Types
- Add 2 more classes(FixedWinCreation, SlidingDoubleWinCreation) which derived from WindowCreation to support more window types, check the files **FixedWinCreation.cs** & **SlidingDoubleWinCreation.cs** for the details.
- Add 2 more classes(FixedWinPara, SlidingDoubleWinPara) which derived from **WindowParameter** to handle the specific type of window in WindowParameter.cs, the code looks like:
```
    /// <summary>
    /// This class inherits from WindowParameter
    /// TBD: Add more specific parameters related Fixed window
    /// </summary>
    public class FixedWinPara : WindowParameter
    {
        /// <summary>
        /// store the m_inset
        /// </summary>
        double m_inset = 0.0;

        /// <summary>
        /// store the m_sillHeight
        /// </summary>
        double m_sillHeight = 0.0;

        #region
        /// <summary>
        /// set/get Inset property
        /// </summary>
        public double Inset
        {
            set
            {
                m_inset = value;
            }
            get
            {
                return m_inset;
            }
        }

        /// <summary>
        /// set/get SillHeight property
        /// </summary>
        public double SillHeight
        {
            set
            {
                m_sillHeight = value;
            }
            get
            {
                return m_sillHeight;
            }
        }
        #endregion

        /// <summary>
        /// constructor of FixedWinPara
        /// </summary>
        /// <param name="isMetric">indicate whether the template is metric of imperial</param>
        public FixedWinPara(bool isMetric)
            : base(isMetric)
        {
            if (isMetric)
            {
                m_inset = 20;
                m_sillHeight = 800;
            }
            else
            {
                m_inset = 0.05;
                m_sillHeight = 3;
            }
        }

        /// <summary>
        /// constructor of FixedWinPara
        /// </summary>
        /// <param name="fixedPara">FixedWinPara</param>
        public FixedWinPara(FixedWinPara fixedPara)
            : base(fixedPara)
        {
            m_inset = fixedPara.Inset;
            m_sillHeight = fixedPara.SillHeight;
        }
    }


    /// <summary>
    /// This class inherits from WindowParameter,
    /// TBD: Add more specific parameters related SlidingDouble window
    /// </summary>
    public class SlidingDoubleWinPara : WindowParameter
    {
        /// <summary>
        /// store the m_inset
        /// </summary>
        double m_inset = 0.0;

        /// <summary>
        /// store the m_sillHeight
        /// </summary>
        double m_sillHeight = 0.0;

        #region
        /// <summary>
        /// set/get Inset property
        /// </summary>
        public double Inset
        {
            set
            {
                m_inset = value;
            }
            get
            {
                return m_inset;
            }
        }

        /// <summary>
        /// set/get SillHeight property
        /// </summary>
        public double SillHeight
        {
            set
            {
                m_sillHeight = value;
            }
            get
            {
                return m_sillHeight;
            }
        }
        #endregion

        /// <summary>
        /// constructor of SlidingDoubleWinPara
        /// </summary>
        /// <param name="isMetric">indicate whether the template is metric of imperial</param>
        public SlidingDoubleWinPara(bool isMetric)
            : base(isMetric)
        {
            if (isMetric)
            {
                m_inset = 20;
                m_sillHeight = 800;
            }
            else
            {
                m_inset = 0.05;
                m_sillHeight = 3;
            }
        }

        /// <summary>
        /// constructor of SlidingDoubleWinPara
        /// </summary>
        /// <param name="slidingDoublePara">SlidingDoubleWinPara</param>
        public SlidingDoubleWinPara(FixedWinPara slidingDoublePara)
            : base(slidingDoublePara)
        {
            m_inset = slidingDoublePara.Inset;
            m_sillHeight = slidingDoublePara.SillHeight;
        }
    }
```
- Modify the WindowWizard.RunWizard() to accordingly to support the 2 types as follow:
```    
        public bool RunWizard()
        {
            // For Window Family Creation workItem
            WindowsDAParams windowFamilyParams;
            windowFamilyParams = WindowsDAParams.Parse("WindowParams.json");

            m_para = new WizardParameter();
            m_para.m_template = windowFamilyParams.WindowStyle;

            if (m_para.m_template.Equals("DoubleHungWindow", StringComparison.CurrentCultureIgnoreCase))
            {
                m_winCreator = new DoubleHungWinCreation(m_para, m_commandData);
                foreach (TypeDAParams type in windowFamilyParams.Types)
                {
                    DoubleHungWinPara dbhungWinPara = new DoubleHungWinPara(m_para.Validator.IsMetric);
                    dbhungWinPara.Height = type.WindowHeight;
                    dbhungWinPara.Width = type.WindowWidth;
                    dbhungWinPara.Inset = type.WindowInset;
                    dbhungWinPara.SillHeight = type.WindowSillHeight;
                    dbhungWinPara.Type = type.TypeName;
                    m_para.CurrentPara = dbhungWinPara;
                    if (!m_para.WinParaTab.Contains(dbhungWinPara.Type))
                    {
                        m_para.WinParaTab.Add(dbhungWinPara.Type, dbhungWinPara);
                    }
                    else
                    {
                        m_para.WinParaTab[dbhungWinPara.Type] = dbhungWinPara;
                    }
                }
                m_para.GlassMat = windowFamilyParams.GlassPaneMaterial;
                m_para.SashMat = windowFamilyParams.SashMaterial;
            }
            else if(m_para.m_template == "SlidingDoubleWindow")
            {
                m_winCreator = new SlidingDoubleWinCreation(m_para, m_commandData);
                foreach (TypeDAParams type in windowFamilyParams.Types)
                {
                    SlidingDoubleWinPara slidingDoubleWinPara = new SlidingDoubleWinPara(m_para.Validator.IsMetric);
                    slidingDoubleWinPara.Height = type.WindowHeight;
                    slidingDoubleWinPara.Width = type.WindowWidth;
                    slidingDoubleWinPara.Inset = type.WindowInset;
                    slidingDoubleWinPara.SillHeight = type.WindowSillHeight;
                    slidingDoubleWinPara.Type = type.TypeName;
                    m_para.CurrentPara = slidingDoubleWinPara;
                    if (!m_para.WinParaTab.Contains(slidingDoubleWinPara.Type))
                    {
                        m_para.WinParaTab.Add(slidingDoubleWinPara.Type, slidingDoubleWinPara);
                    }
                    else
                    {
                        m_para.WinParaTab[slidingDoubleWinPara.Type] = slidingDoubleWinPara;
                    }
                }
                m_para.GlassMat = windowFamilyParams.GlassPaneMaterial;
                m_para.SashMat = windowFamilyParams.SashMaterial;
            }
            else
            {
                m_winCreator = new FixedWinCreation(m_para, m_commandData);
                foreach (TypeDAParams type in windowFamilyParams.Types)
                {
                    FixedWinPara fixedWinPara = new FixedWinPara(m_para.Validator.IsMetric);
                    fixedWinPara.Height = type.WindowHeight;
                    fixedWinPara.Width = type.WindowWidth;
                    fixedWinPara.Inset = type.WindowInset;
                    fixedWinPara.SillHeight = type.WindowSillHeight;
                    fixedWinPara.Type = type.TypeName;
                    m_para.CurrentPara = fixedWinPara;
                    if (!m_para.WinParaTab.Contains(fixedWinPara.Type))
                    {
                        m_para.WinParaTab.Add(fixedWinPara.Type, fixedWinPara);
                    }
                    else
                    {
                        m_para.WinParaTab[fixedWinPara.Type] = fixedWinPara;
                    }
                }
                m_para.GlassMat = windowFamilyParams.GlassPaneMaterial;
                m_para.SashMat = windowFamilyParams.SashMaterial;
            }
            return Creation();
        }

```

# Written by
Revit SDK sample, Updated by Zhong Wu, [Forge Partner Development](http://forge.autodesk.com)
