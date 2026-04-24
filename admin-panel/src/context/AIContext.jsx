import React, { createContext, useContext, useState } from 'react';

const AIContext = createContext();

export function AIProvider({ children }) {
  const [pageContext, setPageContext] = useState({
    url: window.location.pathname,
    pageName: 'Dashboard',
    data: {}, // Minimal JSON of visible records
  });

  const [aiIntent, setAiIntent] = useState(null); // Used to pass actions (like prefill forms)

  const updateContext = (pageName, data) => {
    setPageContext({
      url: window.location.pathname,
      pageName,
      data,
    });
  };

  const dispatchIntent = (intent) => {
    setAiIntent(intent);
    // Auto-clear intent after 2 seconds to avoid infinite loops
    setTimeout(() => setAiIntent(null), 2000);
  };

  return (
    <AIContext.Provider value={{ pageContext, updateContext, aiIntent, dispatchIntent }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAIContext = () => useContext(AIContext);
