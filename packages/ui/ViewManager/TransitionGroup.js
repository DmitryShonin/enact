/**
 * Exports the {@link module:@enact/ui/ViewManager~TransitionGroup} component.
 *
 * @module @enact/ui/ViewManager/TransitionGroup
 */

// Using string refs from the source code of ReactTransitionGroup
/* eslint-disable react/no-string-refs */

import R from 'ramda';
import React from 'react';

/**
 * Returns the index of a child in an array found by `key` matching
 *
 * @param {Object} child React element to find
 * @param {Object[]} children Array of React elements
 * @returns {Number} Index of child
 * @method
 * @private
 */
const indexOfChild = R.useWith(R.findIndex, [R.propEq('key'), R.identity]);

/**
 * Returns `true` if `children` contains `child`
 *
 * @param {Object} child React element to find
 * @param {Object[]} children Array of React elements
 * @returns {Boolean} `true` if `child` is present
 * @method
 * @private
 */
const hasChild = R.compose(R.lte(0), indexOfChild);

/**
 * Returns an array of non-null children
 *
 * @param  {Object[]} children Array of React children
 *
 * @returns {Object[]}          Array of children
 * @private
 */
const mapChildren = function (children) {
	const result = children && React.Children.toArray(children);
	return result ? result.filter(c => !!c) : [];
};

/**
 * Merges two arrays of children without any duplicates (by `key`)
 *
 * @param {Object[]} a Set of children
 * @param {Object[]} b Set of children
 * @returns {Object[]} Merged set of children
 * @method
 * @private
 */
const mergeChildren = R.unionWith(R.eqBy(R.prop('key')));

/**
 * Manages the transition of added and removed child components. Children that are added are
 * transitioned in and those removed are transition out via optional callbacks on the child.
 *
 * Ported from [ReactTransitionGroup]
 * (https://facebook.github.io/react/docs/animation.html#low-level-api-reacttransitiongroup).
 * Currently somewhat specialized for the purposes of ViewManager.
 *
 * @class TransitionGroup
 * @private
 */

class TransitionGroup extends React.Component {
	static propTypes = {
		children: React.PropTypes.node.isRequired,

		/**
		 * Adapts children to be compatible with TransitionGroup
		 *
		 * @type {Function}
		 */
		childFactory: React.PropTypes.func,

		/**
		 * Type of component wrapping the children. May be a DOM node or a custom React component.
		 *
		 * @type {String|React.Component}
		 * @default 'div'
		 */
		component: React.PropTypes.any,

		/**
		 * Maximum number of rendered children. Used to limit how many visible transitions are
		 * active at any time. A value of 1 would prevent any exit transitions whereas a value of 2,
		 * the default, would ensure that only 1 view is transitioning on and 1 view is
		 * transitioning off at a time.
		 *
		 * @type {Number}
		 * @default 2
		 */
		size: React.PropTypes.number
	}

	static defaultProps = {
		childFactory: R.identity,
		component: 'div',
		size: 2
	}

	constructor (props) {
		super(props);
		this.state = {
			children: mapChildren(this.props.children)
		};
	}

	componentWillMount () {
		this.currentlyTransitioningKeys = {};
		this.keysToEnter = [];
		this.keysToLeave = [];
		this.keysToStay = [];
	}

	componentDidMount () {
		// this isn't used by ViewManager or View at the moment but leaving it around for future
		// flexibility
		this.state.children.forEach(child => this.performAppear(child.key));
	}

	componentWillReceiveProps (nextProps) {
		const nextChildMapping = mapChildren(nextProps.children);
		const prevChildMapping = this.state.children;
		let children = mergeChildren(prevChildMapping, nextChildMapping);

		// drop children exceeding allowed size
		const drop = children.length - nextProps.size;
		let dropped = null;
		if (drop > 0) {
			[dropped, children] = R.splitAt(drop, children);
		}

		// cache the new set of children
		this.setState({children});

		// mark any new child as entering
		nextChildMapping.forEach(child => {
			const key = child.key;
			const hasPrev = hasChild(key, prevChildMapping);
			const isDropped = dropped && hasChild(key, dropped);
			// flag a view to enter if it isn't being dropped, if it's new (!hasPrev), or if it's
			// not new (hasPrev) but is re-entering (is currently transitioning)
			if (!isDropped) {
				if (!hasPrev || this.currentlyTransitioningKeys[key]) {
					this.keysToEnter.push(key);
				} else {
					this.keysToStay.push(key);
				}
			}
		});

		// mark any previous child not remaining as leaving
		prevChildMapping.forEach(child => {
			const key = child.key;
			const hasNext = hasChild(key, nextChildMapping);
			const isDropped = dropped && hasChild(key, dropped);
			// flag a view to leave if it isn't being dropped and it isn't in the new set (!hasNext)
			if (!isDropped && !hasNext) {
				this.keysToLeave.push(key);
			}
		});

		// if any views were dropped because they exceeded `size`, the can no longer be
		// transitioning so indicate as such
		if (dropped) {
			dropped.forEach(child => {
				delete this.currentlyTransitioningKeys[child.key];
			});
		}
	}

	componentDidUpdate () {
		// once the component has been updated, start the enter transition for new children,
		const keysToEnter = this.keysToEnter;
		this.keysToEnter = [];
		keysToEnter.forEach(this.performEnter);

		// ... the stay transition for any children remaining,
		const keysToStay = this.keysToStay;
		this.keysToStay = [];
		keysToStay.forEach(this.performStay);

		// ... and the leave transition for departing children
		const keysToLeave = this.keysToLeave;
		this.keysToLeave = [];
		keysToLeave.forEach(this.performLeave);

	}

	performAppear = (key) => {
		this.currentlyTransitioningKeys[key] = true;

		const component = this.refs[key];

		if (component.componentWillAppear) {
			component.componentWillAppear(
				this._handleDoneAppearing.bind(this, key)
			);
		} else {
			this._handleDoneAppearing(key);
		}
	}

	_handleDoneAppearing = (key) => {
		const component = this.refs[key];
		if (component.componentDidAppear) {
			component.componentDidAppear();
		}

		delete this.currentlyTransitioningKeys[key];

		let currentChildMapping = mapChildren(this.props.children);

		if (!currentChildMapping || !hasChild(key, currentChildMapping)) {
			// This was removed before it had fully appeared. Remove it.
			this.performLeave(key);
		}
	}

	performEnter = (key) => {
		this.currentlyTransitioningKeys[key] = true;

		const component = this.refs[key];

		if (component.componentWillEnter) {
			component.componentWillEnter(
				this._handleDoneEntering.bind(this, key)
			);
		} else {
			this._handleDoneEntering(key);
		}
	}

	_handleDoneEntering = (key) => {
		const component = this.refs[key];
		if (component.componentDidEnter) {
			component.componentDidEnter();
		}

		delete this.currentlyTransitioningKeys[key];
	}

	performStay = (key) => {
		const component = this.refs[key];

		if (component.componentWillStay) {
			component.componentWillStay(
				this._handleDoneStaying.bind(this, key)
			);
		} else {
			this._handleDoneStaying(key);
		}
	}

	_handleDoneStaying = (key) => {
		const component = this.refs[key];
		if (component.componentDidStay) {
			component.componentDidStay();
		}
	}

	performLeave = (key) => {
		this.currentlyTransitioningKeys[key] = true;

		const component = this.refs[key];
		if (component.componentWillLeave) {
			component.componentWillLeave(this._handleDoneLeaving.bind(this, key));
		} else {
			// Note that this is somewhat dangerous b/c it calls setState()
			// again, effectively mutating the component before all the work
			// is done.
			this._handleDoneLeaving(key);
		}
	}

	_handleDoneLeaving = (key) => {
		const component = this.refs[key];

		if (component.componentDidLeave) {
			component.componentDidLeave();
		}

		delete this.currentlyTransitioningKeys[key];

		this.setState(function (state) {
			const index = indexOfChild(key, state.children);
			return {children: R.remove(index, 1, state.children)};
		});
	}

	render () {
		// support wrapping arbitrary children with a component that supports the necessary
		// lifecycle methods to animate transitions
		const childrenToRender = this.state.children.map(child => {
			return React.cloneElement(
				this.props.childFactory(child),
				{key: child.key, ref: child.key}
			);
		});

		// Do not forward TransitionGroup props to primitive DOM nodes
		const props = Object.assign({}, this.props);
		delete props.size;
		delete props.childFactory;
		delete props.component;

		return React.createElement(
			this.props.component,
			props,
			childrenToRender
		);
	}
}

export default TransitionGroup;
export {TransitionGroup};