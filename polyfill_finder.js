const browserslist = require('browserslist')
const browsers = browserslist().join(', ');
const fs = require('fs');

const {
    list,              // array of required modules
    targets,           // object with targets for each module
} = require('core-js-compat')({
    targets: browsers,
    filter: 'es.',
});

const stream = fs.createWriteStream("./components/polyfills.js")
list.forEach((mod) => {
    stream.write("import 'core-js/" + mod.replace(/\./g, '/') + "';\n");
});

stream.close();