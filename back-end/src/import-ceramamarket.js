import { ceramaSections, collectCerama } from './ceramamarket.js';
import { createStore } from './store.js';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('npm.cmd run import:ceramamarket -- --section tiles|plumbing|flooring|panels|all\nComma-separated sections supported. Default: all. No login required.');
} else {
  const selection = args.length === 0 ? 'all' : args.length === 2 && args[0] === '--section' ? args[1] : '';
  const sections = selection === 'all' ? ['panels', 'flooring', 'tiles', 'plumbing'] : [...new Set(selection.split(','))];
  if (sections.some((section) => !Object.hasOwn(ceramaSections, section))) { console.error('Invalid section; use --help'); process.exitCode = 1; }
  else {
    const store = createStore();
    try {
      for (const section of sections) {
        const department = ceramaSections[section].department;
        const report = { sourceId: 'ceramamarket', section, department, startedAt: new Date().toISOString(), imported: 0, errors: [] };
        try {
          const result = await collectCerama(section, { progress: ({ page, pages, products }) => {
            if (page === 1 || page % 5 === 0 || page === pages) console.log(`${section}: page ${page}/${pages}, ${products} products`);
          } });
          Object.assign(report, { imported: result.products.length, skippedNoPrice: result.skipped, listed: result.listed, pages: result.pages, finishedAt: new Date().toISOString() });
          store.replaceSource('ceramamarket', result.products, report, department);
          console.log(JSON.stringify(report));
        } catch (error) {
          report.imported = 0; report.errors.push(error.message); report.finishedAt = new Date().toISOString();
          store.record(report); console.error(`${section}: ${error.message}`); process.exitCode = 1;
        }
      }
    } finally { store.close(); }
  }
}
