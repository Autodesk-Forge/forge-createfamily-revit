//
// (C) Copyright 2003-2017 by Autodesk, Inc.
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
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE. AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
//
// Use, duplication, or disclosure by the U.S. Government is subject to
// restrictions set forth in FAR 52.227-19 (Commercial Computer
// Software - Restricted Rights) and DFAR 252.227-7013(c)(1)(ii)
// (Rights in Technical Data and Computer Software), as applicable.
//

using System;
using Autodesk.Revit;

namespace Autodesk.Forge.RevitIO.CreateWindow
{
    /// <summary>
    /// The class is used to create window wizard form
    /// </summary>
    public class WindowWizard
    {
        /// <summary>
        /// store the WizardParameter
        /// </summary>
        private WizardParameter m_para;
        
        /// <summary>
        /// store the WindowCreation
        /// </summary>
        private WindowCreation m_winCreator;

        /// <summary>
        /// store the ExternalCommandData
        /// </summary>
        private CreateWindowData m_commandData;

        /// <summary>
        /// constructor of WindowWizard
        /// </summary>
        /// <param name="commandData">the ExternalCommandData parameter</param>
        public WindowWizard(CreateWindowData commandData)
        {
            m_commandData = commandData;
        }

        /// <summary>
        /// the method is used to show wizard form and do the creation
        /// </summary>
        /// <returns>the process result</returns>
        public bool RunWizard()
        {
            m_para = new WizardParameter();           
            m_para.m_template = "DoubleHung";
            if (m_para.m_template == "DoubleHung")
            {
                m_winCreator = new DoubleHungWinCreation(m_para, m_commandData);
            }

            // For Window Family Creation workItem
            WindowsDAParams windowFamilyParams;
            if ( RuntimeValue.RunOnCloud)
            {
                windowFamilyParams = WindowsDAParams.Parse("WindowParams.json");
            }
            else
            {
                windowFamilyParams = WindowsDAParams.Parse("C:\\Users\\zhongwu\\Documents\\WindowParams.json");
            }

            // Set the wizard data from client side
            if (m_para.m_template == "DoubleHung")
            {
                foreach( TypeDAParams type in windowFamilyParams.Types)
                {
                    DoubleHungWinPara dbhungPara = new DoubleHungWinPara(m_para.Validator.IsMetric);
                    dbhungPara.Height = type.WindowHeight;
                    dbhungPara.Width = type.WindowWidth;
                    dbhungPara.Inset = type.WindowInset;
                    dbhungPara.SillHeight = type.WindowSillHeight;
                    dbhungPara.Type = type.TypeName;
                    m_para.CurrentPara = dbhungPara;
                    if (!m_para.WinParaTab.Contains(dbhungPara.Type))
                    {
                        m_para.WinParaTab.Add(dbhungPara.Type, dbhungPara);
                    }
                    else
                    {
                        m_para.WinParaTab[dbhungPara.Type] = dbhungPara;
                    }
                }
                m_para.GlassMat = windowFamilyParams.GlassPaneMaterial;
                m_para.SashMat = windowFamilyParams.SashMaterial;
            }
            return Creation();
        }

        /// <summary>
        /// The window creation process
        /// </summary>
        /// <returns>the result</returns>
        private bool Creation()
        {
            return m_winCreator.Creation();
        }

    }
}
