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
