/**
 * Exports the {@link moonstone/VideoPlayer.Video} and
 * {@link moonstone/VideoPlayer.Video} components. The default export is
 * {@link moonstone/VideoPlayer.Video}.
 *
 * @module moonstone/VideoPlayer
 */

import {forward} from '@enact/core/handle';
import ForwardRef from '@enact/ui/ForwardRef';
import {Media, getKeyFromSource} from '@enact/ui/Media';
import Slottable from '@enact/ui/Slottable';
import compose from 'ramda/src/compose';
import React from 'react';

import css from './VideoPlayer.less';

import PropTypes from 'prop-types';

/**
 * Video {@link moonstone/VideoPlayer}.
 *
 * @class VideoBase
 * @memberof moonstone/VideoPlayer
 * @ui
 * @private
 */
class VideoBase extends React.Component {
	static propTypes = /** @lends moonstone/VideoPlayer.VideoBase.prototype */ {

		/**
		 * Video component to use. The default (`'video'`) renders an `HTMLVideoElement`. Custom
		 * video components must have a similar API structure, exposing the following APIs:
		 *
		 * Properties:
		 * * `currentTime` {Number} - Playback index of the media in seconds
		 * * `duration` {Number} - Media's entire duration in seconds
		 * * `error` {Boolean} - `true` if video playback has errored.
		 * * `loading` {Boolean} - `true` if video playback is loading.
		 * * `paused` {Boolean} - Playing vs paused state. `true` means the media is paused
		 * * `playbackRate` {Number} - Current playback rate, as a number
		 * * `proportionLoaded` {Number} - A value between `0` and `1`
		 *	representing the proportion of the media that has loaded
		 * * `proportionPlayed` {Number} - A value between `0` and `1` representing the
		 *	proportion of the media that has already been shown
		 *
		 * Methods:
		 * * `play()` - play video
		 * * `pause()` - pause video
		 * * `load()` - load video
		 *
		 * The [`source`]{@link moonstone/VideoPlayer.VideoPlayerBase.source} property is passed to the video
		 * component as a child node.
		 *
		 * @type {Component}
		 * @default 'video'
		 * @public
		 */
		mediaComponent: PropTypes.oneOfType([PropTypes.string, PropTypes.func, PropTypes.element]),

		/**
		 * By default, the video will start playing immediately after it's loaded, unless this is set.
		 *
		 * @type {Boolean}
		 * @default false
		 * @public
		 */
		noAutoPlay: PropTypes.bool,

		/**
		 * The video source to be preloaded. Expects a `<source>` node.
		 *
		 * @type {String|Node}
		 * @public
		 */
		preloadSource:  PropTypes.node,

		setMedia: PropTypes.func,

		/**
		 * Any children `<source>` tag elements of [VideoPlayer]{@link moonstone/VideoPlayer} will
		 * be sent directly to the `mediaComponent` as video sources.
		 * See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source
		 *
		 * @type {Node}
		 * @public
		 */
		source: PropTypes.node
	}

	static defaultProps = {
		mediaComponent: 'video'
	}

	constructor (props) {
		super(props);
		this.isPlayerMounted = false;

		this.loaded = {
			video: false,
			preload: false
		};
	}

	componentDidMount () {
		this.isPlayerMounted = true;
		this.setMedia();
	}

	componentDidUpdate (prevProps) {
		const {source, preloadSource} = this.props;
		const {source: prevSource, preloadSource: prevPreloadSource} = prevProps;

		const key = getKeyFromSource(source);
		const prevKey = getKeyFromSource(prevSource);
		const preloadKey = getKeyFromSource(preloadSource);
		const prevPreloadKey = getKeyFromSource(prevPreloadSource);

		// if there's source and it has changed and it's not the prior preloaded source
		if (source && key !== prevKey && key !== prevPreloadKey) {
			// flag it as unloaded
			this.loaded.video = false;
		}

		// if there's a preload and it has changed and
		if (preloadSource && preloadKey !== prevPreloadKey) {
			// flag it as unloaded (if its not the same as source) and load it
			this.loaded.preload = preloadKey === key;

			// In the case that the previous source equalled the previous preload (causing the
			// preload video node to not be created) and then the preload source was changed, we
			// need to guard against accessing the preloadVideo node.
			if (this.preloadVideo) {
				this.preloadVideo.load();
			}
		}

		if (this.props.setMedia !== prevProps.setMedia) {
			this.clearMedia(prevProps);
			this.setMedia();
		}

		// if the preload video is switched to the current, try to play it now because it won't fire
		// an onLoadStart events since it has already loaded.
		if (source && prevPreloadKey === key) {
			this.autoPlay();
		}
	}

	componentWillUnmount () {
		this.clearMedia();
	}

	canPlay () {
		return this.isPlayerMounted && this.loaded.video && (
			// video can play if there isn't a preloaded source or there is and it has loaded
			!this.props.preloadSource || this.loaded.preload
		);
	}

	clearMedia ({setMedia} = this.props) {
		if (setMedia) {
			setMedia(null);
		}
	}

	setMedia ({setMedia} = this.props) {
		if (setMedia) {
			setMedia(this.video);
		}
	}

	autoPlay () {
		if (this.props.noAutoPlay || !this.canPlay()) return;

		this.video.play();

		forward('onLoadStart', this.loadStartEvent, this.props);
	}

	// These methods are here because on webOS TVs we can't play a video until after second video
	// player is loaded
	handleVideoLoadStart = (ev) => {
		this.loaded.video = true;
		this.loadStartEvent = {...ev};
		this.autoPlay();
	}

	handlePreloadVideoLoadStart = () => {
		this.loaded.preload = true;
		this.autoPlay();
	}

	setVideoRef = (node) => {
		this.video = node;
		this.setMedia();
	}

	setPreloadRef = (node) => {
		if (node && this.loaded.preload === false) {
			node.load();
		}
		this.preloadVideo = node;
	}

	render () {
		const {
			preloadSource,
			source,
			mediaComponent,
			...rest
		} = this.props;

		delete rest.noAutoPlay;
		delete rest.setMedia;

		const sourceKey = getKeyFromSource(source);
		let preloadKey = getKeyFromSource(preloadSource);

		// prevent duplicate components by suppressing preload when sources are the same
		if (sourceKey === preloadKey) {
			preloadKey = null;
		}

		return (
			<React.Fragment>
				{sourceKey ? (
					<Media
						{...rest}
						autoPlay={false}
						className={css.video}
						controls={false}
						key={sourceKey}
						mediaComponent={mediaComponent}
						onLoadStart={this.handleVideoLoadStart}
						preload="none"
						ref={this.setVideoRef}
						source={React.isValidElement(source) ? source : (
							<source src={source} />
						)}
					/>
				) : null}
				{preloadKey ? (
					<Media
						autoPlay={false}
						className={css.preloadVideo}
						controls={false}
						key={preloadKey}
						mediaComponent={mediaComponent}
						noAutoLoad
						onLoadStart={this.handlePreloadVideoLoadStart}
						preload="auto"
						ref={this.setPreloadRef}
						source={React.isValidElement(preloadSource) ? preloadSource : (
							<source src={preloadSource} />
						)}
					/>
				) : null}
			</React.Fragment>
		);
	}
}

const VideoDecorator = compose(
	ForwardRef({prop: 'setMedia'}),
	Slottable({slots: ['source', 'preloadSource']})
);

const Video = VideoDecorator(VideoBase);
Video.defaultSlot = 'videoComponent';

export default Video;
export {
	Video
};
