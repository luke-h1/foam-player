import { useEffect, useState } from "react";
import { TwitchPlayer } from "./components";
import "./App.css";

function App() {
  const [channel, setChannel] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const channelParam = urlParams.get("channel");

    if (channelParam) {
      setChannel(channelParam);
    }
  }, []);

  return (
    <div>
      {channel ? (
        <TwitchPlayer channel={channel} />
      ) : (
        <div className="no-channel">
          <p>Enter a channel name</p>
        </div>
      )}
    </div>
  );
}

export default App;
