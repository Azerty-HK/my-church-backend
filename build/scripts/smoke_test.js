"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("react-native-get-random-values");
const constants_1 = require("../utils/constants");
const database_1 = require("../lib/database");
async function runForProvider(provider) {
    try {
        console.log(`\n--- Testing provider: ${provider} ---`);
        (0, constants_1.setDbProvider)(provider);
        await database_1.DatabaseService.initialize();
        console.log('Attempting demo auth (admin@demo.mychurch.com / demo123)');
        try {
            const auth = await database_1.DatabaseService.authenticateUser('admin@demo.mychurch.com', 'demo123');
            console.log('Demo auth OK — church:', auth.church?.name, 'user:', auth.user?.email);
        }
        catch (err) {
            console.error('Demo auth failed:', err?.message || err);
        }
        console.log('Creating a new test church...');
        const newChurch = await database_1.DatabaseService.createChurch({
            name: `Smoke Test Church (${provider})`,
            email: `smoke-${provider}@example.com`,
            currency: 'FC',
            address: 'Smoke Street 1'
        });
        console.log('Created church id:', newChurch.id);
        console.log('Creating a member for the new church...');
        const member = await database_1.DatabaseService.createMember({
            church_id: newChurch.id,
            first_name: 'Smoke',
            last_name: 'Tester',
            email: `smoke.member@${provider}.example`,
            phone: '+000000000'
        });
        console.log('Created member id:', member.id);
        const members = await database_1.DatabaseService.getMembers(newChurch.id);
        console.log(`Members for church (${newChurch.id}):`, members.map(m => `${m.first_name} ${m.last_name}`));
        console.log('Smoke tests for', provider, 'completed successfully');
        return true;
    }
    catch (error) {
        console.error('Smoke test failed for', provider, error?.message || error);
        return false;
    }
}
async function main() {
    const providers = ['mysql', 'postgresql'];
    for (const p of providers) {
        const ok = await runForProvider(p);
        if (!ok) {
            console.error(`One or more checks failed for provider: ${p}`);
        }
    }
    console.log('\nAll smoke tests finished.');
}
main().catch(err => { console.error('Fatal error during smoke tests:', err); process.exit(1); });
