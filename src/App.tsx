import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [aiApps, setAiApps] = useState<Array<Schema["AIApp"]["type"]>>([]);

  useEffect(() => {
    client.models.AIApp.observeQuery().subscribe({
      next: (data) => setAiApps([...data.items]),
    });
  }, []);

  function createAIApp() {
    const appName = window.prompt("App content");
    if (appName) {
      client.models.AIApp.create({ 
        name: appName,
        url: "https://example.com" // Default URL since it's required
      });
    }
  }

  return (
    <main>
      <h1>AI Marketplace Finland</h1>
      <button onClick={createAIApp}>+ new</button>
      <ul>
        {aiApps.map((listing) => (
          <li key={listing.id}>{listing.name}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new listing.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;
