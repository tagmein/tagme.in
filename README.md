# tagme.in

> Slow text social network, may the best ideas win.

Visit: https://tagme.in/#/Tag%20Me%20In%20News

Please leave all feedback for Tag Me In at https://tagme.in/#/tmi:feedback

## Screenshot

![image](https://github.com/user-attachments/assets/2911c35b-318f-4995-9c36-b9e487b663ea)

## Features

Tag Me In features include:

- List of popular channels
- Channels with messages, with user scoring
- Unique velocity-based voting system
- Maximum positive score velocity is +10 per hour
- Minimum negative score velocity is -10 per hour
- Messages that fall below 0 score are subject to removal by the public
- Message reactions and replies
- Image urls in messages display the image
- Hashtags connect #channels in messages
- Highly customizeable color scheme with light and dark mode and 15 tint hues
- Only the top 1,000 messages are retained per channel
- Only the top 1,000 channels are displayed in the 'Popular channels' section
- Messages must be 3 - 175 characters long
- YouTube video links embed a video player
- Simple code formulas in messages are evaluated, like `= 5 * 3` would render as `15`

## Development

To start the development front end, run `./serve` which just runs `python3 -m http.server -d public 8000` so really any HTTP server can serve the front end. There's no framework other than JavaScript, and a https://github.com/tagmein/civil-memory compatible key-value store, one for auth, one for public data, and one for private data for signed in users.

To run the development server, use Cloudflare's wrangler cli to run the functions locally (note: add more detail here in the future on wrangler setup).

The following environment variables may be set:

- TAGMEIN_KV ......... cloudflare binding to primary kv store
- TAGMEIN_AUTH_KV .... cloudflare binding to auth kv store
- TAGMEIN_PRIVATE_KV . cloudflare binding to private kv store

If you visit exactly `http://localhost:8000`, the app will use the production APIs, simplifying front end development when no api changes are needed.

## Hosting

The software is open source, and easy to host on Cloudflare - just set up this repository as a Workers project. View the Workers docs at https://developers.cloudflare.com/workers/

It might require functional updates to host on a platform that is not Cloudflare

## Setting login code on Civil Memory for realms

For example, if you want to connect Tag Me In to a running Civil Memory instance, and Tag Me In is requesting code "1234":

```
async function go() {
 async function check (r) {
  console.log(await r.status, await r.text())
 }
 await check(
  await fetch(
   '/?mode=disk&modeOptions.disk.basePath=./.kv-public&key=code', { method: 'post', body: '1234' }
  )
 );
}
go()
```

## Contributing

Contributions welcome.

Please ensure you have the rights to what you are contributing, and your desire to release your contribution into the public domain, from which we will then use it in Tag Me In.

Thank you.
