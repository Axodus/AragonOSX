/**
 * Enable additional matchers for chai. If @defi-wonderland/smock is present,
 * its matchers are registered; otherwise, chai works without smock.
 * Import this file in place of chai, i.e:
 * import { expect } from './chai-setup';
 */
import chai from 'chai';

try {
	// Dynamically require to avoid hard dependency when not installed
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { smock } = require('@defi-wonderland/smock');
	if (smock?.matchers) {
		chai.use(smock.matchers);
	}
} catch (_) {
	// smock not available; proceed without its matchers
}

export = chai;
