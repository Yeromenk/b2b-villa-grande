import {readFile} from 'node:fs/promises';
import {createStore} from './store.js';
import {runImport} from './importer.js';

let store;
try {
    const sources = JSON.parse(await readFile(process.argv[2] || 'sources.local.json', 'utf8'));
    store = createStore();
    const report = await runImport(sources, store);
    console.log(JSON.stringify(report, null, 2));
    if (report.errors.length) process.exitCode = 1;
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    store?.close();
}
