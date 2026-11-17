import { runAIAndControlsTests } from './ai-controls.test';
import { runEconomyAndStoreTests } from './economy-store.test';
import { runPhysicsTests } from './physics.test';
import { runStorageAndMigrationTests } from './storage-migrations.test';

const suites: Array<{ name: string; run: () => number }> = [
  { name: 'Physics Engine', run: runPhysicsTests },
  { name: 'AI & Controls', run: runAIAndControlsTests },
  { name: 'Economy & Store', run: runEconomyAndStoreTests },
  { name: 'Storage & Migrations', run: runStorageAndMigrationTests },
];

let totalPassed = 0;
let failed = 0;

for (const suite of suites) {
  try {
    const count = suite.run();
    totalPassed += count;
    console.log(`PASS [${suite.name}] (${count} assertions groups)`);
  } catch (err) {
    failed++;
    console.error(`FAIL [${suite.name}]:`, err);
  }
}

console.log(
  `\nSummary: ${suites.length - failed}/${suites.length} suites passed (${totalPassed} test groups).`
);

if (failed > 0) {
  process.exit(1);
}
