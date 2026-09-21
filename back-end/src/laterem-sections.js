export const lateremSections = {
  plumbing: { category: '0', department: 'Сантехніка' },
  tiles: { category: '23', department: 'Плитка' },
  stone: { category: '36', department: 'Натуральний камінь' },
  spa: { category: '24', department: 'СПА' },
  engineering: { category: '31', department: 'Інженерія' },
};

export function parseSections(args) {
  if (!args.length) return ['plumbing'];
  if (args.length !== 2 || args[0] !== '--section') throw new Error('Use --section plumbing|tiles|stone|spa|engineering|all (or comma-separated names)');
  const keys = args[1] === 'all' ? Object.keys(lateremSections) : [...new Set(args[1].split(','))];
  if (!keys.length || keys.some((key) => !Object.hasOwn(lateremSections, key))) throw new Error('Unknown Laterem section. Run npm.cmd run import:laterem -- --help');
  return keys;
}
