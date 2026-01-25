## foam-player

Custom Twitch.tv embed for the react native app Foam.

### Features

- **Orientation Support**: Automatically adapts to portrait/landscape orientation changes
- **Content Classification Gates**: Detects and properly scales content gates for user interaction
- **Custom Styles**: Hides Twitch UI elements and provides clean player experience
- **Low Latency Mode**: Automatically enables low latency streaming when available
- **Playback Recovery**: Detects and recovers from stuck playback
- **Video Controls**: Exposes player controls via `window.playerControls` API
- **Error Detection**: Monitors for offline streams and errors

### URL Parameters

Base URL: `/player?channelName={CHANNELNAME}`

- `channelName` - Twitch channel name (required for live streams)
- `video` - Video ID (for VODs)

Example:
```
https://player.example.com/player?channelName=shroud
```

### Player Controls API

The player exposes controls via `window.playerControls`:

```javascript
window.playerControls.play()      // Play video
window.playerControls.pause()     // Pause video
window.playerControls.mute()      // Mute audio
window.playerControls.unmute()    // Unmute audio
window.playerControls.setVolume(0.5)  // Set volume (0-1)
window.playerControls.seek(120)   // Seek to time in seconds
window.playerControls.getState()  // Get current player state
```

### Building

```bash
npm install
npm run build
```

The built files will be in the `dist/` directory.
