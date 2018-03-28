# Teapot
### Running
To get around the issue of reading files from the local filesystem, it is best to test by running a local webserver. There are two relatively easy ways to do this:

- If you use the Brackets editor, the live preview function will start up a server (and browser) to test your code.
Just have Chrome open, and the open your html file in Brackets. Click the lightning bolt icon in the top right of the Brackets window. If it does not work, try to open the entire folder with Brackets and then click the lightning bolt icon again.
- Alternatively, you can install [node.js](https://nodejs.org/). Then install and run [httpserver](https://www.npmjs.com/package/httpserver) to serve the directory that it is run from.
