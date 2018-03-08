/**
 * Provides the {@link spotlight/Pause.Pause} class which allows consumers to pause spotlight and
 * then only resume spotlight if another caller had not also paused Spotlight.
 *
 * ```
 * import Pause from '@enact/spotlight/Pause';
 *
 * const paused1 = new Pause();
 * const paused2 = new Pause();
 *
 * // pauses spotlight
 * paused1.pause();
 *
 * // spotlight is still paused and controlling Pause is
 * // updated to paused2
 * paused2.pause();
 *
 * // has no effect because paused2 is in control
 * paused1.resume();
 *
 * // resumes spotlight
 * paused2.resume();
 * ```
 *
 * @module spotlight/Pause
 */

let pauseCount = 0;

// Private, exported methods used by Spotlight to set and query the pause state from its public API

function pause () {
	pauseCount++;
}

function resume () {
	if (pauseCount > 0) {
		pauseCount--;
	}
}

function isPaused () {
	return pauseCount !== 0;
}

/**
 * Acts as a semaphore for Spotlight pause state ensuring that only the last Pause instance can
 * resume Spotlight.
 *
 * *Note* {@link spotlight/Spotlight.resume} will always resume spotlight regardless of what last
 * paused spotlight and can be used as an escape hatch to force resumption.
 *
 * @class Pause
 * @memberof spotlight/Pause
 * @public
 */
class Pause {
	/**
	 * Pauses spotlight if not currently paused
	 *
	 * @returns {undefined}
	 * @memberof spotlight/Pause.Pause
	 * @public
	 */
	pause () {
		pause();
	}

	/**
	 * Resumes spotlight if this instance was the last to pause spotlight
	 *
	 * @returns {Boolean} `true` if spotlight was resumed
	 * @memberof spotlight/Pause.Pause
	 * @public
	 */
	resume () {
		resume();
		return !isPaused();
	}
}

export default Pause;
export {
	Pause,
	isPaused,
	pause,
	resume
};
