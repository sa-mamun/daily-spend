import React, { useState } from "react";
import { SQLiteProvider } from "expo-sqlite";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageContext } from "./src/context/LanguageContext";
import { initDb } from "./src/data/database";
import { CustomSplash } from "./src/components/CustomSplash";
import { ExpenseApp } from "./src/application/ExpenseApp";
import { useFonts } from "expo-font";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [fontsLoaded, fontError] = useFonts({
    "DMSans-400": require("./assets/fonts/DMSans-400.ttf"),
    "DMSans-500": require("./assets/fonts/DMSans-500.ttf"),
    "DMSans-600": require("./assets/fonts/DMSans-600.ttf"),
    "NotoSansBengali-400": require("./assets/fonts/NotoSansBengali-400.ttf"),
    "NotoSansBengali-500": require("./assets/fonts/NotoSansBengali-500.ttf"),
    "NotoSansBengali-600": require("./assets/fonts/NotoSansBengali-600.ttf"),
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName="kharcho.db" onInit={initDb}>
          <ExpenseApp splashVisible={showSplash} />
          {showSplash && <CustomSplash onFinish={() => setShowSplash(false)} />}
        </SQLiteProvider>
      </SafeAreaProvider>
    </LanguageContext.Provider>
  );
}
export default App;
