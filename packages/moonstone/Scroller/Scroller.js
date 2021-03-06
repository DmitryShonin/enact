/**
 * Provides Moonstone-themed scroller components and behaviors.
 * @example
 * <Scroller>
 * 	<div style={{height: "150px"}}>
 * 		<p>San Francisco</p>
 * 		<p>Seoul</p>
 * 		<p>Bangalore</p>
 * 		<p>New York</p>
 * 		<p>London</p>
 * 	</div>
 * </Scroller>
 *
 * @module moonstone/Scroller
 * @exports Scroller
 * @exports ScrollerBase
 */

import ri from '@enact/ui/resolution';
import {ScrollerBase as UiScrollerBase} from '@enact/ui/Scroller';
import {Spotlight} from '@enact/spotlight';
import {getTargetByDirectionFromPosition} from '@enact/spotlight/src/target';
import PropTypes from 'prop-types';
import React, {Component} from 'react';

import Scrollable from '../Scrollable';
import ScrollableNative from '../Scrollable/ScrollableNative';

const
	dataContainerDisabledAttribute = 'data-spotlight-container-disabled',
	reverseDirections = {
		left: 'right',
		right: 'left'
	};

/**
 * A Moonstone-styled base component for [Scroller]{@link moonstone/Scroller.Scroller}.
 * In most circumstances, you will want to use the
 * [SpotlightContainerDecorator]{@link spotlight/SpotlightContainerDecorator.SpotlightContainerDecorator}
 * and the Scrollable version, [Scroller]{@link moonstone/Scroller.Scroller}.
 *
 * @class ScrollerBase
 * @memberof moonstone/Scroller
 * @ui
 * @public
 */
class ScrollerBase extends Component {
	static displayName = 'ScrollerBase'

	static propTypes = /** @lends moonstone/Scroller.Scroller.prototype */ {
		/**
		 * Passes the instance of [Scroller]{@link ui/Scroller.Scroller}.
		 *
		 * @type {Object}
		 * @param {Object} ref
		 * @private
		 */
		initUiChildRef: PropTypes.func,

		/**
		 * Called when [Scroller]{@link moonstone/Scroller.Scroller} updates.
		 *
		 * @type {function}
		 * @private
		 */
		onUpdate: PropTypes.func,

		/**
		 * `true` if rtl, `false` if ltr.
		 *
		 * @type {Boolean}
		 * @private
		 */
		rtl: PropTypes.bool,

		/**
		 * The spotlight id for the component.
		 *
		 * @type {String}
		 * @private
		 */
		spotlightId: PropTypes.string
	}

	componentDidMount () {
		this.configureSpotlight();
	}

	componentDidUpdate (prevProps) {
		const {onUpdate} = this.props;
		if (onUpdate) {
			onUpdate();
		}

		if (prevProps.spotlightId !== this.props.spotlightId) {
			this.configureSpotlight();
		}
	}

	componentWillUnmount () {
		this.setContainerDisabled(false);
	}

	configureSpotlight () {
		Spotlight.set(this.props.spotlightId, {
			onLeaveContainer: this.handleLeaveContainer,
			onLeaveContainerFail: this.handleLeaveContainer
		});
	}

	/**
	 * Returns the first spotlight container between `node` and the scroller
	 *
	 * @param {Node} node A DOM node
	 *
	 * @returns {Node|Null} Spotlight container for `node`
	 * @private
	 */
	getSpotlightContainerForNode = (node) => {
		do {
			if (node.dataset.spotlightId && node.dataset.spotlightContainer && !node.dataset.expandableContainer) {
				return node;
			}
		} while ((node = node.parentNode) && node !== this.uiRef.containerRef);
	}

	/**
	 * Calculates the "focus bounds" of a node. If the node is within a spotlight container, that
	 * container is scrolled into view rather than just the element.
	 *
	 * @param {Node} node Focused node
	 *
	 * @returns {Object} Bounds as returned by `getBoundingClientRect`
	 * @private
	 */
	getFocusedItemBounds = (node) => {
		node = this.getSpotlightContainerForNode(node) || node;
		return node.getBoundingClientRect();
	}

	/**
	 * Calculates the new `scrollTop`.
	 *
	 * @param {Node} focusedItem node
	 * @param {Number} itemTop of the focusedItem / focusedContainer
	 * @param {Number} itemHeight of focusedItem / focusedContainer
	 * @param {Object} scrollInfo position info. Uses `scrollInfo.previousScrollHeight`
	 * and `scrollInfo.scrollTop`
	 * @param {Number} scrollPosition last target position, passed scroll animation is ongoing
	 *
	 * @returns {Number} Calculated `scrollTop`
	 * @private
	 */
	calculateScrollTop = (item) => {
		const roundToBoundary = (sb, st, sh) => {
			const threshold = ri.scale(24);

			// round to start
			if (st < threshold) return 0;

			// round to end
			if (sh - (st + sb.height) < threshold) return sh - sb.height;

			return st;
		};
		const isItemBeforeView = (ib, sb, d) => ib.top + d < sb.top;
		const isItemAfterView = (ib, sb, d) => ib.top + d + ib.height > sb.top + sb.height;
		const canItemFit = (ib, sb) => ib.height <= sb.height;
		const calcItemAtStart = (ib, sb, st, d) => ib.top + st + d - sb.top;
		const calcItemAtEnd = (ib, sb, st, d) => ib.top + ib.height + st + d - (sb.top + sb.height);
		const calcItemInView = (ib, sb, st, sh, d) => {
			if (isItemBeforeView(ib, sb, d)) {
				return roundToBoundary(sb, calcItemAtStart(ib, sb, st, d), sh, d);
			} else if (isItemAfterView(ib, sb, d)) {
				return roundToBoundary(sb, calcItemAtEnd(ib, sb, st, d), sh, d);
			}

			return st;
		};

		const container = this.getSpotlightContainerForNode(item);
		const scrollerBounds = this.uiRef.containerRef.getBoundingClientRect();
		let {scrollHeight, scrollTop} = this.uiRef.containerRef;
		let scrollTopDelta = 0;

		const adjustScrollTop = (v) => {
			scrollTopDelta = scrollTop - v;
			scrollTop = v;
		};

		if (container) {
			const containerBounds = container.getBoundingClientRect();

			// if the entire container fits in the scroller, scroll it into view
			if (canItemFit(containerBounds, scrollerBounds)) {
				return calcItemInView(containerBounds, scrollerBounds, scrollTop, scrollHeight, scrollTopDelta);
			}

			// if the container doesn't fit, adjust the scroll top ...
			if (containerBounds.top > scrollerBounds.top) {
				// ... to the top of the container if the top is below the top of the scroller
				adjustScrollTop(calcItemAtStart(containerBounds, scrollerBounds, scrollTop, scrollTopDelta));
			}
			// removing support for "snap to bottom" for 2.2.8
			// } else if (containerBounds.top + containerBounds.height < scrollerBounds.top + scrollerBounds.height) {
			// 	// ... to the bottom of the container if the bottom is above the bottom of the
			// 	// scroller
			// 	adjustScrollTop(calcItemAtEnd(containerBounds, scrollerBounds, scrollTop, scrollTopDelta));
			// }

			// N.B. if the container covers the scrollable area (its top is above the top of the
			// scroller and its bottom is below the bottom of the scroller), we need not adjust the
			// scroller to ensure the container is wholly in view.
		}

		const itemBounds = item.getBoundingClientRect();

		return calcItemInView(itemBounds, scrollerBounds, scrollTop, scrollHeight, scrollTopDelta);
	}

	/**
	 * Calculates the new top and left position for scroller based on focusedItem.
	 *
	 * @param {Node} item node
	 * @param {Object} scrollInfo position info. `calculateScrollTop` uses
	 * `scrollInfo.previousScrollHeight` and `scrollInfo.scrollTop`
	 * @param {Number} scrollPosition last target position, passed scroll animation is ongoing
	 *
	 * @returns {Object} with keys {top, left} containing calculated top and left positions for scroll.
	 * @private
	 */
	calculatePositionOnFocus = ({item, scrollPosition}) => {
		if (!this.uiRef.isVertical() && !this.uiRef.isHorizontal() || !item || !this.uiRef.containerRef.contains(item)) {
			return;
		}

		if (this.uiRef.isVertical()) {
			this.uiRef.scrollPos.top = this.calculateScrollTop(item);
		} else if (this.uiRef.isHorizontal()) {
			const {
				left: itemLeft,
				width: itemWidth
			} = this.getFocusedItemBounds(item);

			const
				{rtl} = this.props,
				{clientWidth} = this.uiRef.scrollBounds,
				rtlDirection = rtl ? -1 : 1,
				{left: containerLeft} = this.uiRef.containerRef.getBoundingClientRect(),
				scrollLastPosition = scrollPosition ? scrollPosition : this.uiRef.scrollPos.left,
				currentScrollLeft = rtl ? (this.uiRef.scrollBounds.maxLeft - scrollLastPosition) : scrollLastPosition,
				// calculation based on client position
				newItemLeft = this.uiRef.containerRef.scrollLeft + (itemLeft - containerLeft);

			if (newItemLeft + itemWidth > (clientWidth + currentScrollLeft) && itemWidth < clientWidth) {
				// If focus is moved to an element outside of view area (to the right), scroller will move
				// to the right just enough to show the current `focusedItem`. This does not apply to
				// `focusedItem` that has a width that is bigger than `this.scrollBounds.clientWidth`.
				this.uiRef.scrollPos.left += rtlDirection * ((newItemLeft + itemWidth) - (clientWidth + currentScrollLeft));
			} else if (newItemLeft < currentScrollLeft) {
				// If focus is outside of the view area to the left, move scroller to the left accordingly.
				this.uiRef.scrollPos.left += rtlDirection * (newItemLeft - currentScrollLeft);
			}
		}

		return this.uiRef.scrollPos;
	}

	focusOnNode = (node) => {
		if (node) {
			Spotlight.focus(node);
		}
	}

	handleGlobalKeyDown = () => {
		this.setContainerDisabled(false);
	}

	setContainerDisabled = (bool) => {
		const
			{spotlightId} = this.props,
			containerNode = document.querySelector(`[data-spotlight-id="${spotlightId}"]`);

		if (containerNode) {
			containerNode.setAttribute(dataContainerDisabledAttribute, bool);

			if (bool) {
				document.addEventListener('keydown', this.handleGlobalKeyDown, {capture: true});
			} else {
				document.removeEventListener('keydown', this.handleGlobalKeyDown, {capture: true});
			}
		}
	}

	getNextEndPoint = (direction, oSpotBounds) => {
		const bounds = this.uiRef.getScrollBounds();

		let oPoint = {};
		switch (direction) {
			case 'up':
				oPoint.x = oSpotBounds.left;
				oPoint.y = oSpotBounds.top - bounds.clientHeight;
				break;
			case 'left':
				oPoint.x = oSpotBounds.left - bounds.clientWidth;
				oPoint.y = oSpotBounds.top;
				break;
			case 'down':
				oPoint.x = oSpotBounds.left;
				oPoint.y = oSpotBounds.top + oSpotBounds.height + bounds.clientHeight;
				break;
			case 'right':
				oPoint.x = oSpotBounds.left + oSpotBounds.width + bounds.clientWidth;
				oPoint.y = oSpotBounds.top;
				break;
		}
		return oPoint;
	}

	scrollToNextPage = ({direction, focusedItem, reverseDirection, spotlightId}) => {
		const endPoint = this.getNextEndPoint(direction, focusedItem.getBoundingClientRect());
		let candidateNode = null;

		/* Find a spottable item in the next page */
		candidateNode = getTargetByDirectionFromPosition(reverseDirection, endPoint, spotlightId);

		/* Find a spottable item in a whole data */
		if (candidateNode === focusedItem) {
			candidateNode = getTargetByDirectionFromPosition(direction, endPoint, spotlightId);
		}

		/* If there is no spottable item next to the current item */
		if (candidateNode === focusedItem) {
			return null;
		}

		return candidateNode;
	}

	scrollToBoundary = (direction) => {
		const
			{scrollBounds, scrollPos} = this.uiRef,
			isVerticalDirection = (direction === 'up' || direction === 'down');

		if (isVerticalDirection) {
			if (scrollPos.top > 0 && scrollPos.top < scrollBounds.maxTop) {
				this.uiRef.props.cbScrollTo({align: direction === 'up' ? 'top' : 'bottom'});
			}
		} else if (scrollPos.left > 0 && scrollPos.left < scrollBounds.maxLeft) {
			this.uiRef.props.cbScrollTo({align: this.props.rtl ? reverseDirections[direction] : direction});
		}
	}

	handleLeaveContainer = ({direction, target}) => {
		const contentsContainer = this.uiRef.containerRef;
		// ensure we only scroll to boundary from the contents and not a scroll button which
		// lie outside of this.uiRef.containerRef but within the spotlight container
		if (contentsContainer && contentsContainer.contains(target)) {
			this.scrollToBoundary(direction);
		}
	}

	initUiRef = (ref) => {
		if (ref) {
			this.uiRef = ref;
			this.props.initUiChildRef(ref);
		}
	}

	render () {
		const props = Object.assign({}, this.props);

		delete props.initUiChildRef;
		delete props.onUpdate;
		delete props.spotlightId;

		return (
			<UiScrollerBase
				{...props}
				ref={this.initUiRef}
			/>
		);
	}
}

/**
 * A Moonstone-styled Scroller, Scrollable applied.
 *
 * Usage:
 * ```
 * <Scroller>Scroll me.</Scroller>
 * ```
 *
 * @class Scroller
 * @memberof moonstone/Scroller
 * @extends moonstone/Scrollable.Scrollable
 * @extends moonstone/Scroller.ScrollerBase
 * @ui
 * @public
 */
const Scroller = (props) => (
	<Scrollable
		{...props}
		childRenderer={(scrollerProps) => { // eslint-disable-line react/jsx-no-bind
			return <ScrollerBase {...scrollerProps} />;
		}}
	/>
);

Scroller.propTypes = /** @lends moonstone/Scroller.Scroller.prototype */ {
	/**
	 * Direction of the scroller.
	 *
	 * * Values: `'both'`, `'horizontal'`, `'vertical'`.
	 *
	 * @type {String}
	 * @default 'both'
	 * @public
	 */
	direction: PropTypes.oneOf(['both', 'horizontal', 'vertical'])
};

Scroller.defaultProps = {
	direction: 'both'
};

/**
 * A Moonstone-styled native Scroller, Scrollable applied.
 *
 * For smooth native scrolling, web engine with below Chromium 61, should be launched
 * with the flag '--enable-blink-features=CSSOMSmoothScroll' to support it.
 * The one with Chromium 61 or above, is launched to support it by default.
 *
 * Usage:
 * ```
 * <ScrollerNative>Scroll me.</ScrollerNative>
 * ```
 *
 * @class ScrollerNative
 * @memberof moonstone/Scroller
 * @extends moonstone/Scrollable.ScrollableNative
 * @extends moonstone/Scroller.ScrollerBase
 * @ui
 * @private
 */
const ScrollerNative = (props) => (
	<ScrollableNative
		{...props}
		childRenderer={(scrollerProps) => { // eslint-disable-line react/jsx-no-bind
			return <ScrollerBase {...scrollerProps} />;
		}}
	/>
);

ScrollerNative.propTypes = /** @lends moonstone/Scroller.ScrollerNative.prototype */ {
	/**
	 * Direction of the scroller.
	 *
	 * * Values: `'both'`, `'horizontal'`, `'vertical'`.
	 *
	 * @type {String}
	 * @default 'both'
	 * @public
	 */
	direction: PropTypes.oneOf(['both', 'horizontal', 'vertical'])
};

ScrollerNative.defaultProps = {
	direction: 'both'
};

export default Scroller;
export {
	Scroller,
	ScrollerBase,
	ScrollerNative
};
