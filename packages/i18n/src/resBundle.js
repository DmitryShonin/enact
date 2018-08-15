import ResBundle from '../ilib/lib/ResBundle';
import Locale from '../ilib/lib/Locale';

// The ilib.ResBundle for the active locale used by $L
let resBundle;

/**
 * Returns the current ilib.ResBundle
 */
function getResBundle () {
	return resBundle;
}

/**
 * Creates a new ilib.ResBundle for string translation
 *
 * @param  {ilib.Locale} locale Locale for ResBundle
 *
 * @returns {Promise|ResBundle} Resolves with a new ilib.ResBundle
 */
function createResBundle (locale, options, sync = true) {
	const opts = {
		locale: locale,
		type: 'html',
		name: 'strings',
		lengthen: true,		// if pseudo-localizing, this tells it to lengthen strings
		sync,
		...options
	};

	if (sync) {
		return new ResBundle(opts);
	}

	return new Promise((resolve, reject) => {
		// eslint-disable-next-line no-new
		new ResBundle({
			...opts,
			onLoad: (bundle) => {
				if (bundle) {
					resolve(bundle);
				}

				reject();
			}
		});
	});
}

/**
 * Set the locale for the strings that $L loads. This may reload the
 * string resources if necessary.
 *
 * @param {string} spec the locale specifier
 * @returns {Promise} Resolves with a new ilib.ResBundle
 */
function setResBundleLocale (spec, sync) {
	// Load any ResBundle external data into cache.
	ResBundle.strings = ResBundle.strings || {};
	ResBundle.strings.cache = global.resBundleData || ResBundle.strings.cache;
	// Get active bundle and if needed, (re)initialize.
	const locale = new Locale(spec);
	if (!resBundle || spec !== resBundle.getLocale().getSpec()) {
		if (!sync) {
			return createResBundle(locale, null, false).then(bundle => {
				resBundle = bundle;
			});
		}

		resBundle = createResBundle(locale, null, true);
	}

	return resBundle;
}

/**
 * Deletes the current bundle object of strings and clears the cache.
 * @returns {undefined}
 */
function clearResBundle () {
	delete ResBundle.strings;
	delete ResBundle.sysres;
	resBundle = null;
}

export {
	getResBundle,
	setResBundleLocale,
	clearResBundle,
	createResBundle
};
