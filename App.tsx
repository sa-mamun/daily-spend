import React, { useState } from "react";
import { SQLiteProvider } from "expo-sqlite";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageContext } from "./src/context/LanguageContext";
import { initDb } from "./src/data/database";
import { CustomSplash } from "./src/components/CustomSplash";
import { ExpenseApp } from "./src/application/ExpenseApp";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguage] = useState<"en" | "bn">("en");

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
