import React, { Component, createElement, cloneElement } from 'react'
import PropTypes from 'prop-types';
import raf, { cancel as caf } from 'raf';
import css from 'dom-css';
import isString from '../utils/isString';
import getScrollbarWidth from '../utils/getScrollbarWidth';
import returnFalse from '../utils/returnFalse';
import getInnerWidth from '../utils/getInnerWidth';
import getInnerHeight from '../utils/getInnerHeight';
import * as styles from './styles';

export default class Scrollbars extends Component {
    constructor(props, ...rest) {
        super(props, ...rest);
        this.state = {
            didMountUniversal: false,
        };
    }
    componentDidMount() {
        this.addListeners();
        this.update();
        this.componentDidMountUniversal();
    }

    componentDidMountUniversal() { // eslint-disable-line react/sort-comp
        if (!this.props.universal) return;
        this.setState({ didMountUniversal: true });
    }

    componentDidUpdate() {
        this.update();
    }

    componentWillUnmount() {
        this.removeListeners();
        caf(this.requestFrame);
        clearTimeout(this.hideTracksTimeout);
        clearInterval(this.detectScrollingInterval);
    }

    getScrollLeft() {
        const { view } = this;
        return view.scrollLeft;
    }

    getScrollTop() {
        const { view } = this;
        return view.scrollTop;
    }

    getScrollWidth() {
        const { view } = this;
        return view.scrollWidth - this.getPaddingWidth();
    }

    getScrollHeight() {
        const { view } = this;
        return view.scrollHeight - this.getPaddingHeight();
    }

    getClientWidth() {
        const { view } = this;
        return view.clientWidth - this.getPaddingWidth();
    }

    getClientHeight() {
        const { view } = this;
        return view.clientHeight - this.getPaddingHeight();
    }

    getPaddingWidth() {
        return styles.scrollbarSize;
    }

    getPaddingHeight() {
        return styles.scrollbarSize;
    }

    getValues() {
        const { view } = this;
        const {
            scrollLeft,
            scrollTop
        } = view;

        const scrollWidth = view.scrollWidth - this.getPaddingWidth();
        const scrollHeight = view.scrollHeight - this.getPaddingHeight();
        const clientWidth = view.clientWidth - this.getPaddingWidth();
        const clientHeight = view.clientHeight - this.getPaddingHeight();

        return {
            left: (scrollLeft / (scrollWidth - clientWidth)) || 0,
            top: (scrollTop / (scrollHeight - clientHeight)) || 0,
            scrollLeft,
            scrollTop,
            scrollWidth,
            scrollHeight,
            clientWidth,
            clientHeight
        };
    }

    getThumbHorizontalWidth() {
        const { thumbSize, thumbMinSize } = this.props;
        const { view, trackHorizontal } = this;
        const scrollWidth = view.scrollWidth - this.getPaddingWidth();
        const clientWidth = view.clientWidth - this.getPaddingWidth();
        const trackWidth = getInnerWidth(trackHorizontal);
        const width = clientWidth / scrollWidth * trackWidth;
        if (scrollWidth <= clientWidth) return 0;
        if (thumbSize) return thumbSize;
        return Math.max(width, thumbMinSize);
    }

    getThumbVerticalHeight() {
        const { thumbSize, thumbMinSize } = this.props;
        const { view, trackVertical } = this;
        const scrollHeight = view.scrollHeight - this.getPaddingHeight();
        const clientHeight = view.clientHeight - this.getPaddingHeight();
        const trackHeight = getInnerHeight(trackVertical);
        const height = clientHeight / scrollHeight * trackHeight;
        if (scrollHeight <= clientHeight) return 0;
        if (thumbSize) return thumbSize;
        return Math.max(height, thumbMinSize);
    }

    getScrollLeftForOffset(offset) {
        const { view, trackHorizontal } = this;
        const scrollWidth = view.scrollWidth - this.getPaddingWidth();
        const clientWidth = view.clientWidth - this.getPaddingWidth();
        const trackWidth = getInnerWidth(trackHorizontal);
        const thumbWidth = this.getThumbHorizontalWidth();
        return offset / (trackWidth - thumbWidth) * (scrollWidth - clientWidth);
    }

    getScrollTopForOffset(offset) {
        const { view, trackVertical } = this;
        const scrollHeight = view.scrollHeight - this.getPaddingHeight();
        const clientHeight = view.clientHeight - this.getPaddingHeight();
        const trackHeight = getInnerHeight(trackVertical);
        const thumbHeight = this.getThumbVerticalHeight();
        return offset / (trackHeight - thumbHeight) * (scrollHeight - clientHeight);
    }

    scrollLeft(left = 0) {
        const { view } = this;
        view.scrollLeft = left;
    }

    scrollTop(top = 0) {
        const { view } = this;
        view.scrollTop = top;
    }

    scrollToLeft() {
        const { view } = this;
        view.scrollLeft = 0;
    }

    scrollToTop() {
        const { view } = this;
        view.scrollTop = 0;
    }

    scrollToRight() {
        const { view } = this;
        view.scrollLeft = view.scrollWidth - this.getPaddingWidth();
    }
    scrollToBottom() {
        const { view } = this;
        view.scrollTop = view.scrollHeight - this.getPaddingHeight();
    }

    addListeners() {
        /* istanbul ignore if */
        if (typeof document === 'undefined') return;
        const { view, trackHorizontal, trackVertical, thumbHorizontal, thumbVertical } = this;
        view.addEventListener('scroll', this.handleScroll);
        trackHorizontal.addEventListener('mouseenter', this.handleTrackMouseEnter);
        trackHorizontal.addEventListener('mouseleave', this.handleTrackMouseLeave);
        trackHorizontal.addEventListener('mousedown', this.handleHorizontalTrackMouseDown);
        trackVertical.addEventListener('mouseenter', this.handleTrackMouseEnter);
        trackVertical.addEventListener('mouseleave', this.handleTrackMouseLeave);
        trackVertical.addEventListener('mousedown', this.handleVerticalTrackMouseDown);
        thumbHorizontal.addEventListener('mousedown', this.handleHorizontalThumbMouseDown);
        thumbVertical.addEventListener('mousedown', this.handleVerticalThumbMouseDown);
        window.addEventListener('resize', this.handleWindowResize);
    }

    removeListeners() {
        /* istanbul ignore if */
        if (typeof document === 'undefined') return;
        const { view, trackHorizontal, trackVertical, thumbHorizontal, thumbVertical } = this;
        view.removeEventListener('scroll', this.handleScroll);
        trackHorizontal.removeEventListener('mouseenter', this.handleTrackMouseEnter);
        trackHorizontal.removeEventListener('mouseleave', this.handleTrackMouseLeave);
        trackHorizontal.removeEventListener('mousedown', this.handleHorizontalTrackMouseDown);
        trackVertical.removeEventListener('mouseenter', this.handleTrackMouseEnter);
        trackVertical.removeEventListener('mouseleave', this.handleTrackMouseLeave);
        trackVertical.removeEventListener('mousedown', this.handleVerticalTrackMouseDown);
        thumbHorizontal.removeEventListener('mousedown', this.handleHorizontalThumbMouseDown);
        thumbVertical.removeEventListener('mousedown', this.handleVerticalThumbMouseDown);
        window.removeEventListener('resize', this.handleWindowResize);
        // Possibly setup by `handleDragStart`
        this.teardownDragging();
    }

    handleScroll(event) {
        const { onScroll, onScrollFrame } = this.props;
        if (onScroll) onScroll(event);
        this.update(values => {
            const { scrollLeft, scrollTop } = values;
            this.viewScrollLeft = scrollLeft;
            this.viewScrollTop = scrollTop;
            if (onScrollFrame) onScrollFrame(values);
        });
        this.detectScrolling();
    }
    handleScrollStart() {
        const { onScrollStart } = this.props;
        if (onScrollStart) onScrollStart();
        this.handleScrollStartAutoHide();
    }

    handleScrollStartAutoHide() {
        const { autoHide } = this.props;
        if (!autoHide) return;
        this.showTracks();
    }

    handleScrollStop() {
        const { onScrollStop } = this.props;
        if (onScrollStop) onScrollStop();
        this.handleScrollStopAutoHide();
    }

    handleScrollStopAutoHide() {
        const { autoHide } = this.props;
        if (!autoHide) return;
        this.hideTracks();
    }

    handleWindowResize() {
        this.update();
    }

    handleHorizontalTrackMouseDown() {
        const { view } = this;
        const { target, clientX } = event;
        const { left: targetLeft } = target.getBoundingClientRect();
        const thumbWidth = this.getThumbHorizontalWidth();
        const offset = Math.abs(targetLeft - clientX) - thumbWidth / 2;
        view.scrollLeft = this.getScrollLeftForOffset(offset);
    }

    handleVerticalTrackMouseDown(event) {
        const { view } = this;
        const { target, clientY } = event;
        const { top: targetTop } = target.getBoundingClientRect();
        const thumbHeight = this.getThumbVerticalHeight();
        const offset = Math.abs(targetTop - clientY) - thumbHeight / 2;
        view.scrollTop = this.getScrollTopForOffset(offset);
    }

    handleHorizontalThumbMouseDown(event) {
        this.handleDragStart(event);
        const { target, clientX } = event;
        const { offsetWidth } = target;
        const { left } = target.getBoundingClientRect();
        this.prevPageX = offsetWidth - (clientX - left);
    }

    handleVerticalThumbMouseDown(event) {
        this.handleDragStart(event);
        const { target, clientY } = event;
        const { offsetHeight } = target;
        const { top } = target.getBoundingClientRect();
        this.prevPageY = offsetHeight - (clientY - top);
    }

    setupDragging() {
        css(document.body, styles.disableSelectStyle);
        document.addEventListener('mousemove', this.handleDrag);
        document.addEventListener('mouseup', this.handleDragEnd);
        document.onselectstart = returnFalse;
    }

    teardownDragging() {
        css(document.body, styles.disableSelectStyleReset);
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
        document.onselectstart = undefined;
    }

    handleDragStart(event) {
        this.dragging = true;
        event.stopImmediatePropagation();
        this.setupDragging();
    }

    handleDrag(event) {
        if (this.prevPageX) {
            const { clientX } = event;
            const { view, trackHorizontal } = this;
            const { left: trackLeft } = trackHorizontal.getBoundingClientRect();
            const thumbWidth = this.getThumbHorizontalWidth();
            const clickPosition = thumbWidth - this.prevPageX;
            const offset = -trackLeft + clientX - clickPosition;
            view.scrollLeft = this.getScrollLeftForOffset(offset);
        }
        if (this.prevPageY) {
            const { clientY } = event;
            const { view, trackVertical } = this;
            const { top: trackTop } = trackVertical.getBoundingClientRect();
            const thumbHeight = this.getThumbVerticalHeight();
            const clickPosition = thumbHeight - this.prevPageY;
            const offset = -trackTop + clientY - clickPosition;
            view.scrollTop = this.getScrollTopForOffset(offset);
        }
        return false;
    }

    handleDragEnd() {
        this.dragging = false;
        this.prevPageX = this.prevPageY = 0;
        this.teardownDragging();
        this.handleDragEndAutoHide();
    }

    handleDragEndAutoHide() {
        const { autoHide } = this.props;
        if (!autoHide) return;
        this.hideTracks();
    }

    handleTrackMouseEnter() {
        this.trackMouseOver = true;
        this.handleTrackMouseEnterAutoHide();
    }

    handleTrackMouseEnterAutoHide() {
        const { autoHide } = this.props;
        if (!autoHide) return;
        this.showTracks();
    }

    handleTrackMouseLeave() {
        this.trackMouseOver = false;
        this.handleTrackMouseLeaveAutoHide();
    }

    handleTrackMouseLeaveAutoHide() {
        const { autoHide } = this.props;
        if (!autoHide) return;
        this.hideTracks();
    }

    showTracks() {
        const { trackHorizontal, trackVertical } = this;
        clearTimeout(this.hideTracksTimeout);
        css(trackHorizontal, { opacity: 1 });
        css(trackVertical, { opacity: 1 });
    }

    hideTracks() {
        if (this.dragging) return;
        if (this.scrolling) return;
        if (this.trackMouseOver) return;
        const { autoHideTimeout } = this.props;
        const { trackHorizontal, trackVertical } = this;
        clearTimeout(this.hideTracksTimeout);
        this.hideTracksTimeout = setTimeout(() => {
            css(trackHorizontal, { opacity: 0 });
            css(trackVertical, { opacity: 0 });
        }, autoHideTimeout);
    }

    detectScrolling() {
        if (this.scrolling) return;
        this.scrolling = true;
        this.handleScrollStart();
        this.detectScrollingInterval = setInterval(() => {
            if (this.lastViewScrollLeft === this.viewScrollLeft
                && this.lastViewScrollTop === this.viewScrollTop) {
                clearInterval(this.detectScrollingInterval);
                this.scrolling = false;
                this.handleScrollStop();
            }
            this.lastViewScrollLeft = this.viewScrollLeft;
            this.lastViewScrollTop = this.viewScrollTop;
        }, 100);
    }

    raf(callback) {
        if (this.requestFrame) raf.cancel(this.requestFrame);
        this.requestFrame = raf(() => {
            this.requestFrame = undefined;
            callback();
        });
    }

    update(callback) {
        this.raf(() => this._update(callback));
    }

    _update(callback) {
        const { onUpdate, hideTracksWhenNotNeeded } = this.props;
        const { thumbHorizontal, thumbVertical, trackHorizontal, trackVertical, container } = this;
        container.scrollTop = 0;
        container.scrollLeft = 0;
        const values = this.getValues();
        const { scrollLeft, clientWidth, scrollWidth } = values;
        const trackHorizontalWidth = getInnerWidth(trackHorizontal);
        const thumbHorizontalWidth = this.getThumbHorizontalWidth();
        const thumbHorizontalX = scrollLeft / (scrollWidth - clientWidth) * (trackHorizontalWidth - thumbHorizontalWidth);
        const thumbHorizontalStyle = {
            width: thumbHorizontalWidth,
            transform: `translateX(${thumbHorizontalX}px)`
        };
        const { scrollTop, clientHeight, scrollHeight } = values;
        const trackVerticalHeight = getInnerHeight(trackVertical);
        const thumbVerticalHeight = this.getThumbVerticalHeight();
        const thumbVerticalY = scrollTop / (scrollHeight - clientHeight) * (trackVerticalHeight - thumbVerticalHeight);
        const thumbVerticalStyle = {
            height: thumbVerticalHeight,
            transform: `translateY(${thumbVerticalY}px)`
        };
        if (hideTracksWhenNotNeeded) {
            const trackHorizontalStyle = {
                visibility: scrollWidth > clientWidth ? 'visible' : 'hidden'
            };
            const trackVerticalStyle = {
                visibility: scrollHeight > clientHeight ? 'visible' : 'hidden'
            };
            css(trackHorizontal, trackHorizontalStyle);
            css(trackVertical, trackVerticalStyle);
        }
        css(thumbHorizontal, thumbHorizontalStyle);
        css(thumbVertical, thumbVerticalStyle);
        if (onUpdate) onUpdate(values);
        if (typeof callback !== 'function') return;
        callback(values);
    }

    render() {
        const scrollbarWidth = getScrollbarWidth();
        /* eslint-disable no-unused-vars */
        const {
            onScroll,
            onScrollFrame,
            onScrollStart,
            onScrollStop,
            onUpdate,
            renderView,
            renderTrackHorizontal,
            renderTrackVertical,
            renderThumbHorizontal,
            renderThumbVertical,
            tagName,
            hideTracksWhenNotNeeded,
            autoHide,
            autoHideTimeout,
            autoHideDuration,
            thumbSize,
            thumbMinSize,
            universal,
            autoHeight,
            autoHeightMin,
            autoHeightMax,
            autoWidth,
            autoWidthMin,
            autoWidthMax,
            style,
            children,
            overrideDefaultViewStyle,
            viewStyles,
            ...props
        } = this.props;
        /* eslint-enable no-unused-vars */

        const { didMountUniversal } = this.state;

        const containerStyle = {
            ...styles.containerStyleDefault,
            ...(autoHeight && {
                ...styles.containerStyleAutoHeight,
                minHeight: autoHeightMin,
                maxHeight: autoHeightMax
            }),
            ...style
        };

        const viewStyle = {
            ...styles.viewStyleDefault,
            // Hide scrollbars by setting a negative margin
            marginRight: -this.getPaddingWidth() + (scrollbarWidth ? -scrollbarWidth : 0),
            marginBottom: -this.getPaddingHeight() + (scrollbarWidth ? -scrollbarWidth : 0),
            ...(autoHeight && {
                ...styles.viewStyleAutoHeight,
                // Add paddingHeight and scrollbarWidth to autoHeight in order to compensate negative margins
                minHeight: isString(autoHeightMin)
                    ? `calc(${autoHeightMin} + ${this.getPaddingHeight() + scrollbarWidth}px)`
                    : autoHeightMin + this.getPaddingHeight() + scrollbarWidth,
                maxHeight: isString(autoHeightMax)
                    ? `calc(${autoHeightMax} + ${this.getPaddingHeight() + scrollbarWidth}px)`
                    : autoHeightMax + this.getPaddingHeight() + scrollbarWidth
            }),
            // Override min/max height for initial universal rendering
            ...((autoHeight && universal && !didMountUniversal) && {
                minHeight: autoHeightMin,
                maxHeight: autoHeightMax
            }),
            // Override
            ...((universal && !didMountUniversal) && styles.viewStyleUniversalInitial),
            ...(overrideDefaultViewStyle && { ...viewStyles })
        };

        const viewWrapperStyle = {
            ...styles.viewWrapperStyleDefault,
            ...(autoWidth && {
                ...styles.viewWrapperStyleAutoHeight,
                minWidth: autoWidthMin,
                maxWidth: autoWidthMax
            }),
        };

        const viewWrappedStyle = {
            ...styles.viewWrappedStyleDefault
        };


        const trackAutoHeightStyle = {
            transition: `opacity ${autoHideDuration}ms`,
            opacity: 0
        };

        const trackHorizontalStyle = {
            ...styles.trackHorizontalStyleDefault,
            ...(autoHide && trackAutoHeightStyle),
            ...(((universal && !didMountUniversal)) && {
                display: 'none'
            })
        };

        const trackVerticalStyle = {
            ...styles.trackVerticalStyleDefault,
            ...(autoHide && trackAutoHeightStyle),
            ...(((universal && !didMountUniversal)) && {
                display: 'none'
            })
        };

        //createElement(tagName, { ...props, style: containerStyle, ref: (ref) => { this.container = ref; } }, [
        return createElement(tagName, { ...props, style: containerStyle, ref: (ref) => { this.container = ref; } }, [
            cloneElement(
                renderView({ style: viewStyle }),
                { key: 'view', ref: (ref) => { this.view = ref; } },
                children
            ),
            cloneElement(
                renderTrackHorizontal({ style: trackHorizontalStyle }),
                { key: 'trackHorizontal', ref: (ref) => { this.trackHorizontal = ref; } },
                cloneElement(
                    renderThumbHorizontal({ style: styles.thumbHorizontalStyleDefault }),
                    { ref: (ref) => { this.thumbHorizontal = ref; } }
                )
            ),
            cloneElement(
                renderTrackVertical({ style: styles.trackVerticalStyleDefault }),
                { key: 'trackVertical', ref: (ref) => { this.trackVertical = ref; } },
                cloneElement(
                    renderThumbVertical({ style: styles.thumbVerticalStyleDefault }),
                    { ref: (ref) => { this.thumbVertical = ref; } }
                )
            )
        ]);
    }
}

Scrollbars.propTypes = {
    onScroll: PropTypes.func,
    onScrollFrame: PropTypes.func,
    onScrollStart: PropTypes.func,
    onScrollStop: PropTypes.func,
    onUpdate: PropTypes.func,
    renderView: PropTypes.func,
    renderTrackHorizontal: PropTypes.func,
    renderTrackVertical: PropTypes.func,
    renderThumbHorizontal: PropTypes.func,
    renderThumbVertical: PropTypes.func,
    tagName: PropTypes.string,
    thumbSize: PropTypes.number,
    thumbMinSize: PropTypes.number,
    hideTracksWhenNotNeeded: PropTypes.bool,
    autoHide: PropTypes.bool,
    autoHideTimeout: PropTypes.number,
    autoHideDuration: PropTypes.number,
    autoHeight: PropTypes.bool,
    autoHeightMin: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
    ]),
    autoHeightMax: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
    ]),
    universal: PropTypes.bool,
    style: PropTypes.object,
    children: PropTypes.node,
};

Scrollbars.defaultProps = {
    renderView: props => <div {...props}/>,
    renderTrackHorizontal: function renderTrackHorizontalDefault({ style, ...props }) {
        const finalStyle = {
            ...style,
            right: 2,
            bottom: 2,
            left: 2,
            borderRadius: 3
        };
        return <div style={finalStyle} {...props} />;
    },
    renderTrackVertical: function renderTrackVerticalDefault({ style, ...props }) {
        const finalStyle = {
            ...style,
            right: 2,
            bottom: 2,
            top: 2,
            borderRadius: 3
        };
        return <div style={finalStyle} {...props} />;
    },
    renderThumbHorizontal: function renderThumbHorizontalDefault({ style, ...props }) {
        const finalStyle = {
            ...style,
            cursor: 'pointer',
            borderRadius: 'inherit',
            backgroundColor: 'rgba(0,0,0,.2)'
        };
        return <div style={finalStyle} {...props} />;
    },
    renderThumbVertical: function renderThumbVerticalDefault({ style, ...props }) {
        const finalStyle = {
            ...style,
            cursor: 'pointer',
            borderRadius: 'inherit',
            backgroundColor: 'rgba(0,0,0,.2)'
        };
        return <div style={finalStyle} {...props} />;
    },
    tagName: 'div',
    thumbMinSize: 30,
    hideTracksWhenNotNeeded: false,
    autoHide: false,
    autoHideTimeout: 1000,
    autoHideDuration: 200,
    autoHeight: false,
    autoHeightMin: 0,
    autoHeightMax: 200,
    autoWidth: false,
    autoWidthMin: '100%',
    autoWidthMax: '100%',
    universal: false,
};
