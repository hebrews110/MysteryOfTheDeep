/// <reference path="gametools.d.ts" />

/* import "./components/polyfills.js"; */
import "core-js/stable";
import "regenerator-runtime/runtime";

import './components/dom-polyfills.js';

import asyncLib from 'async';

import './external/import-jquery';

import './external/jquery.svg.min';
import './external/jquery.svg.css';

import './external/jqueryui/jquery-ui.min.js';
import './external/jqueryui/jquery-ui.min.css';

import './external/jquery.ui.touch-punch.min.js';

import 'popper.js';
import 'bootstrap';

import './components/shortcut.js';

/*
require('./styles.scss');
require('./external/jquery.svg.min');
require('./external/jquery.svg.css');
*/

import React, { Suspense, lazy } from 'react';

import * as ReactDOM from 'react-dom';

import * as ReactDOMServer from 'react-dom/server';


import { RoutedTabs, NavTab } from "react-router-tabs";

import { MemoryRouter as Router, Route, Link } from "react-router-dom";

import paula_pacific from './external/paula_pacific.png';

import '@fortawesome/fontawesome-free/css/all.css';

import 'intersection-observer';

import domtoimage from 'dom-to-image-more';

import BrowserDetect from './components/browserdetect.js';

import RiveScript from './node_modules/rivescript/lib/rivescript.js';

import { toggleInputDisabled, toggleMsgLoader, addResponseMessage, addUserMessage, Widget, dropMessages } from './components/chat/index.js';

import moment from 'moment';

import { default as Moment, MomentProps } from 'react-moment';

import 'jquery-touch-events';

import pluralize from 'pluralize';

import ScrollBooster from 'scrollbooster';

import ClipLoader from 'react-spinners/ClipLoader';

import Emitter from 'component-emitter';

import { Line } from 'react-chartjs-2';

// import the plugin core
import 'chartjs-plugin-colorschemes/src/plugins/plugin.colorschemes';

// import a particular color scheme
import { Aspect6 } from 'chartjs-plugin-colorschemes/src/colorschemes/colorschemes.office';

namespace GameTools {
    export let helpRef: React.RefObject<any>;
    let helpShown: boolean;
    let visibleStack: DisplayedItem[];
    export const SPEED_HACK: boolean = process.env.NODE_ENV == 'development';
    (function($) {
        $.fn.randomize = function(childElem) {
            function shuffle(o) {
                for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
                return o;
            }
            return this.each(function() {
                var $this = $(this);
                var elems = $this.children(childElem);
                shuffle(elems);
    
                elems.each(function() {
                    $(this).detach();
                });
    
                for(var i=0; i < elems.length; i++) {
                    $this.append(elems[i]);      
                }
            });    
        };
        $.fn.equals = function(compareTo) {
            if (!compareTo || this.length != compareTo.length) {
              return false;
            }
            for (var i = 0; i < this.length; ++i) {
              if (this[i] !== compareTo[i]) {
                return false;
              }
            }
            return true;
        };
    })(jQuery);
    export let currentLevel = 0;
    export let lastResult: boolean = false;
    export let lastData: any = null;
    type GameArrayFunctionItem = () => GameArrayItem;
    export type GameArrayItem = DisplayedItem|GameArrayFunctionItem;
    export interface GameArray extends Array<GameArrayItem> {
        contentsIndex?: number;
        indexPollers?: Array<() => void>;
        initialized?: boolean;
    }
    export function initializeArray(array: GameArray, clearPollers = false, shouldWarn = false) {
        array.contentsIndex = 0;
        
        if(!array.initialized || clearPollers)
            array.indexPollers = new Array();
        array.initialized = true;
        array.forEach((item) => {
            if(isDisplayedItem(item)) {
                if(shouldWarn || item.getParentArray(false) == null)
                    item.setParentArray(array);
            }
        });
    }
    function wakeUpPollers(array: GameArray) {
        let currentPollers = array.indexPollers.slice();
        currentPollers.forEach((poller) => {
            array.indexPollers = array.indexPollers.splice(array.indexPollers.indexOf(poller), 1);
            poller();
        });
    }
    export function isDisplayedItem(item: GameArrayItem): item is DisplayedItem {
        return ((item as any)._isDisplaying !== undefined);
    }
    async function toDisplayedItem(item: GameArrayItem, array?: GameArray): Promise<DisplayedItem> {
        if(isDisplayedItem(item)) {
            if(!item.resetOnce())
                await item.reset();
            return (item as DisplayedItem);
        }
        const arrayItem: GameArrayFunctionItem = (item as GameArrayFunctionItem);
        let realItem = arrayItem();
        if(isDisplayedItem(realItem)) {
            if(array !== undefined) {
                realItem.setParentArray(array);
                (realItem as any).wrapper = item;
            }
            await realItem.reset();
            return realItem;
        } else {
            let nextItem = await toDisplayedItem(realItem, array);
            return nextItem;
        }
        
    }
    export abstract class DisplayedItem {
        public parentArray: GameArray;
        private arraySet: boolean;
        private _isDisplaying = false;
        public instantiationTrace: string;
        protected autoWakePollers: boolean;
        private wrapper: GameArrayFunctionItem;
        private hasReset: boolean;
        private static showers: number = 0;
        private reactedSet: Set<HTMLElement>;
        public doRenderReact<T extends React.Component>(element: JSX.Element, container: HTMLElement, callback?: (component: T) => any) {
            ReactDOM.render(element, container, function() {
                if(callback != undefined && callback != null)
                    callback(this);
            });
            this.reactedSet.add(container);
        }
        public static getValue<T>(item: DisplayedItem, val: GameValue<T>, container?: HTMLElement): T {
            let value: T;
            if(val == null || val == undefined) {
                value = null;
            } else if(Object(val) !== val) {
                value = ((val as unknown) as T);
            } else if(val instanceof Function) {
                value = val();
            } else if(React.isValidElement(val)) {
                if(container !== undefined && item != null && item != undefined) {
                    item.doRenderReact(val, container);
                    return undefined;
                } else {
                    value = ((ReactDOMServer.renderToStaticMarkup(val) as unknown) as T);
                    console.warn("In most cases, rendering React components to a string will not give the desired behavior, " +
                                 "as event handlers and other related metadata will not be included.");
                }
                
            } else {
                value = (val.valueOf() as T);
            }
            if(container !== undefined) {
                container.innerHTML = ((value as unknown) as string);
                return undefined;
            }
            return value;
        }
        public getAppendedContainer(showingNew: boolean, adjustNumber = true): JQuery<HTMLElement> {
            const $overlay = $("#gametools-container .gametools-overlay");
            const $normal = $("#gametools-container");
            if(this.objStyle.onTop) {
                if(adjustNumber) {
                    if(showingNew)
                        DisplayedItem.showers++;
                    else
                        DisplayedItem.showers--;
                }
                console.log("On top, current showers = " + DisplayedItem.showers);
                console.log($normal.get(0));
                if(DisplayedItem.showers > 0)
                    $normal.addClass("overlay-shown");
                else
                    $normal.removeClass("overlay-shown");
                return $overlay;
            }

            return $normal;
        }
        public isDisplaying(): boolean {
            return this._isDisplaying;
        }
        static getCurrentlyVisible(): DisplayedItem {
            if(visibleStack.length > 0)
                return visibleStack[visibleStack.length - 1];
            else
                return null;
        } 
        static updateHelp(helpItem?: HelpButton) {
            if(helpItem == undefined || helpItem == null)
                helpItem = helpRef.current;
            if(visibleStack.length == 0) {
                if(helpShown)
                    helpItem.setState({ visible: false });
                return;
            }
            const visible = (DisplayedItem.getCurrentlyVisible().getHelp() !== "");
            if(helpShown)
                helpItem.setState({ visible: visible });
        }
        private contextualHelp(): string {
            let item = this as unknown as ContextualHelpItem;
            if(item.gt_help !== undefined)
                return item.gt_help;
            else
                return "";
        }
        public readonly getHelp: () => string = () => {
            return this.objectHelp() + this.contextualHelp();
        };
        protected objectHelp(): string {
            return "";
        }
        constructor(protected objStyle?: StylisticOptions) {
            this._isDisplaying = false;
            this.wrapper = null;
            this.parentArray = null;
            this.arraySet = false;
            this.autoWakePollers = true;
            this.hasReset = false;
            this.reactedSet = new Set<HTMLElement>();
            Emitter(this);
            this.initStyles();
        }
        protected getDefaultStyle(): StylisticOptions {
            return {};
        }
        private initStyles() {
            if(this.objStyle === undefined)
                this.objStyle = this.getDefaultStyle();
            else {
                let df = this.getDefaultStyle();
                Object.assign(df, this.objStyle);
                this.objStyle = df;
            }
            if(this.objStyle.shouldColorBackgrounds === undefined)
                this.objStyle.shouldColorBackgrounds = true;
            if(this.objStyle.shouldShuffle === undefined)
                this.objStyle.shouldShuffle = true;
            if(this.objStyle.showBackdrop === undefined)
                this.objStyle.showBackdrop = true;
            if(this.objStyle.forceShowClose === undefined)
                this.objStyle.forceShowClose = false;
            if(this.objStyle.customBackgroundClassList === undefined)
                this.objStyle.customBackgroundClassList = ""; 
            if(this.objStyle.customBodyClassList === undefined)
                this.objStyle.customBodyClassList = "";
            if(this.objStyle.useAsContainer === undefined)
                this.objStyle.useAsContainer = false;
            if(this.objStyle.showCorrectConfirmation === undefined)
                this.objStyle.showCorrectConfirmation = true;
            if(this.objStyle.onTop == undefined)
                this.objStyle.onTop = false;
            if(this.objStyle.stripPunctuation == undefined)
                this.objStyle.stripPunctuation = true;
            return this.objStyle;
        }
        
        public on: (event: string, fn: (...args: any[]) => void) => void;
        public once: (event: string, fn: (...args: any[]) => void) => void;
        public off: (event?: string, fn?: (...args: any[]) => void) => void;
        public emit: (event: string, ...args: any[]) => void;
        public listeners: (event: string) => ((...args: any[]) => void)[];
        public hasListeners: (event: string) => boolean;
        public setParentArray(array: GameArray, force = false): this {
            if(array == null) {
                array = [ this ];
                initializeArray(array);
            }
            if(force || !this.arraySet) {
                this.parentArray = array;
                this.arraySet = true;
            } else {
                console.warn("Parent array is already set:");
                console.warn(this.parentArray);
                console.warn("Not being changed.");
            }
            return this;
        }
        public getParentArray(createDynamic = true): GameArray {
            if(createDynamic && this.parentArray == null) {
                this.setParentArray([ this ]);
                initializeArray(this.parentArray);
            }
            return this.parentArray;
            
        }
        async resize() {

        }
        public myIndex: () => number = function() {
            let array =  this.getParentArray();
            if(this.wrapper != null)
                return array.indexOf(this.wrapper);
            else
                return array.indexOf(this);
        };
        async display() {
            this._isDisplaying = true;
            visibleStack.push(this);
            DisplayedItem.updateHelp();
            DisplayedItem.updateContainerClasses();
            this.emit("display");
        }
        static updateContainerClasses() {
            if(visibleStack.length > 0)
                $("#gametools-container").addClass("gt-ditem-visible");
            else
                $("#gametools-container").removeClass("gt-ditem-visible");
        }
        private detachReact() {
            this.reactedSet.forEach((element) => {
                ReactDOM.unmountComponentAtNode(element);
                this.reactedSet.delete(element);
            });
        }
        public readonly undisplay = async () => {
            this._isDisplaying = false;
            visibleStack.splice(visibleStack.indexOf(this), 1);
            DisplayedItem.updateHelp();
            DisplayedItem.updateContainerClasses();
            await this.detachReact();
            await this._undisplay();
        };
        async _undisplay() {
            if(this.reactedSet.size > 0) {
                console.error("There should not be any mounted React components on an undisplayed DisplayedItem.");
                this.reactedSet.forEach((react_el) => {
                    console.log(react_el);
                });
            }
            this.emit("undisplay");
        }
        static doLog(obj: any, logFunc: (obj: any) => any, trace: string) {
            logFunc(obj);
            if(trace !== null && trace !== undefined)
                logFunc(trace);
        }
        logError(obj: any): void {
            DisplayedItem.doLog(obj, console.error, this.instantiationTrace);
        }
        logWarning(obj: any): void {
            DisplayedItem.doLog(obj, console.warn, this.instantiationTrace);
        }
        public isSelfContained(): boolean {
            let array = this.getParentArray();
            return (array.length == 1 && array[0] == this);
        }
        getNextItem(): GameArrayItem {
            if(this.myIndex() == -1)
                return null;
            if(this.getParentArray().contentsIndex == this.getParentArray().length - 1) {
                this.logWarning("No next items at index " + this.getParentArray().contentsIndex + " (self-contained: " + this.isSelfContained() + ")");
                return null;
            }
            this.getParentArray().contentsIndex += 1;
            return this.getParentArray()[this.getParentArray().contentsIndex];
        }
        async redisplay() {
            setTimeout(async () => {
                await this.undisplay();
                if(this._isDisplaying)
                    throw new Error("This item did not call super.undisplay()!");
                let err = new Error("The item following this one did not call super.display()!");
                setTimeout(async () => {
                    await this.display();
                    if(!this._isDisplaying)
                        throw err;
                }, 0);
            }, 0);
        }
        protected async moveToNext() {
            let item = this.getNextItem();
            if(item != null) {
                let err = new Error("The item following this one did not call super.display()!");
                setTimeout(async () => {
                    let realItem = await toDisplayedItem(item, this.getParentArray());
                    await realItem.display();
                    if(realItem.autoWakePollers)
                        wakeUpPollers(realItem.getParentArray());
                    if(!realItem._isDisplaying)
                        throw err;
                }, 0);
            }
        }
        public async displayNext() {
            setTimeout(async () => {
                await this.undisplay();
                if(this._isDisplaying)
                    throw new Error("This item did not call super.undisplay()!");
                await this.moveToNext();
            }, 0);
        }
        async reset() {
            this.hasReset = true;
        }
        public resetOnce(): boolean {
            return this.hasReset;
        }
    }

    export function shuffle<T>(a: T[], shouldShuffle = true): T[] {
        if(!shouldShuffle)
            return a;
        let j: number, x: T, i: number;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        return a;
    }
    export interface GameValue<T> {
        gametools_val: {};
    }
    export type Equals<X, Y> =
        (<T>() => T extends X ? 1 : 2) extends
        (<T>() => T extends Y ? 1 : 2) ? true : false;
    export class InfoBox extends DisplayedItem {
        public static readonly defaultDelay = 1000;
        public $dialog: JQuery<HTMLElement>;
        public $title: JQuery<HTMLElement>;
        public $content: JQuery<HTMLElement>;
        public $footer: JQuery<HTMLElement>;
        constructor(protected title: GameValue<string>, protected text: GameValue<string>, protected buttonText: GameValue<string> = "OK", protected delay?: number, style?: StylisticOptions) {
            super(style);
            this.$dialog = null;
            this.$content = null;
            this.$footer = null;
            this.$title = null;
            this.autoWakePollers = false;
        }
        protected async dialogCreated() {

        }
        public buttonCallback(e: JQuery.ClickEvent): void {
            console.log("InfoBox button callback");
            this.displayNext();
        }
        protected addCloseButton() {
            let close_button = $("<button></button>").addClass("close").attr({ "aria-label": "Close"});
            close_button.append($("<span></span>").attr("aria-hidden", "true").html("&times;"));
            close_button.click(this.buttonCallback.bind(this));
            this.$dialog.find(".modal-header").append(close_button);
        }
        async _undisplay() {
            await new Promise((resolve) => {
                this.$dialog.one("hidden.bs.modal", () => resolve());
                this.$dialog.modal('hide');
            });
            await super._undisplay();
        }
        protected dialogDisplayed() {

        }
        async reset() {
            await super.reset();
            if(this.delay == undefined) {
                if(this.myIndex() <= 0) {
                    this.delay = 0;
                } else
                    this.delay = InfoBox.defaultDelay;
            }
        }
        async display() {
            await super.display();
            await new Promise(async(resolve) => {
                await sleep(this.delay);
                this.$dialog = $("<div></div>");
                this.getAppendedContainer(true).append(this.$dialog);
                this.$dialog.addClass("modal fade bd-example-modal-sm");
                this.$dialog.attr({
                    "tabindex": -1,
                    "role": "dialog",
                    "data-keyboard": false,
                    "data-backdrop": false,
                    "aria-hidden": true
                });
                let modal_dialog = $("<div></div>").addClass("modal-dialog modal-dialog-centered modal-xl");
                this.$dialog.append(modal_dialog);
                if((this as DisplayedItem as LabelledItem).gt_label != undefined) {
                    modal_dialog.attr("data-label", (this as DisplayedItem as LabelledItem).gt_label);
                }
                let modal_content = $("<div></div>").addClass("modal-content");
                modal_dialog.append(modal_content);
                modal_content.addClass(this.objStyle.customBackgroundClassList);
                let modal_header = $("<div></div>").addClass("modal-header");
                modal_content.append(modal_header);
                this.$title = $("<h5></h5>").addClass("modal-title");
                modal_header.append(this.$title);
                let close_button = $("<button></button>").addClass("close").attr({ "aria-label": "Close"});
                modal_header.append(close_button);
                close_button.append($("<span></span>").attr("aria-hidden", "true").html("&times;"));
                this.$content = $("<div></div>").addClass("modal-body").addClass(this.objStyle.customBodyClassList);
                modal_content.append(this.$content);
                this.$footer = $("<div></div>").addClass("modal-footer");
                modal_content.append(this.$footer);
                this.$footer.append($("<button></button>").addClass("btn btn-primary").attr("type", "button").text("OK"));

                if(this.title != null) {
                    this.$dialog.find(".modal-header").show();
                    DisplayedItem.getValue(this, this.title, this.$title.get(0));
                } else {
                    this.$dialog.find(".modal-header").hide();
                }
                    
                if(this.text != null) {
                    this.$dialog.find(".modal-body").show();
                    if(!this.objStyle.useAsContainer) {
                        DisplayedItem.getValue(this, this.text, this.$dialog.find(".modal-body").get(0));
                    } else {
                        let header = modal_header.get(0);
                        let footer = this.$footer.get(0);
                        modal_content.empty();
                        DisplayedItem.getValue(this, this.text, modal_content.get(0));
                        let reactContainer = modal_content.children().get(0);
                        $(reactContainer).addClass("modal-body");
                        $(header).insertBefore(reactContainer);
                        $(footer).insertAfter(reactContainer);
                    }
                    
                } else {
                    this.$dialog.find(".modal-body").hide();
                }
                this.$content.find(".gt-preview-image").each((index, el) => {
                    $(el).addClass("mfp-popup-wrapper");
                    ($(el) as any).magnificPopup({
                        items: {
                            src: $(el).attr("src")
                        },
                        type: 'image'
                    });
                });
                this.$dialog.find(".modal-footer").empty();
                
                let realText = DisplayedItem.getValue(this, this.buttonText);
                let closeShown = false;
                if(realText != null && realText != "") {
                    closeShown = true;
                    this.$dialog.find(".close").show();
                    this.$dialog.find(".modal-footer").show();
                    this.$dialog.find(".modal-footer").append($("<button></button>").addClass("btn btn-primary").attr("type", "button").text(realText));
                } else {
                    closeShown = false;
                    this.$dialog.find(".close").hide();
                    this.$dialog.find(".modal-footer").hide();
                }
                if(this.objStyle.forceShowClose) {
                    let $close = this.$dialog.find(".close");
                    $close.show();
                    if(this.title == null) {
                        $close.appendTo(this.$content);
                        $close.addClass("modal-pinned-corner-close");
                    }
                    closeShown = true;
                }
                if(!closeShown)
                    this.$dialog.find(".close").remove();
                await this.dialogCreated();
                let $closeButtons = this.$footer.find("button");
                let $close = this.$dialog.find(".close");
                $closeButtons = $closeButtons.add($close);

                $closeButtons.off("click");
                $closeButtons.on("click", (e) => this.buttonCallback(e));
                
                this.$dialog.one("show.bs.modal", (e) => {
                    var zIndex = 1040 + (10 * $('.modal:visible').length);
                    $(e.target).css('z-index', zIndex);
                    if(this.objStyle.showBackdrop) {
                        let $backdrop = $("<div></div>").addClass("modal-backdrop fade show");
                        $backdrop.css("z-index", zIndex - 5);
                        this.getAppendedContainer(true, false).append($backdrop);
                        $(e.target).data("my-backdrop", $backdrop);
                    } else
                        $(e.target).data("my-backdrop", null);
                });
                this.$dialog.one("shown.bs.modal", () => {
                    $(document.body).removeClass('modal-open');
                    $("#gametools-container").addClass('modal-open');
                    this.dialogDisplayed();
                    resolve();
                    wakeUpPollers(this.getParentArray());
                });
                const _self = this;
                this.$dialog.one("hide.bs.modal", function() {
                    let $backdrop = $(this).data("my-backdrop");
                    if($backdrop != null && $backdrop != undefined) {
                        $backdrop.removeClass("show");
                        setTimeout(() => {
                            $backdrop.remove();
                        }, 250);
                    }
                });
                this.$dialog.one("hidden.bs.modal", (): void => {
                    this.$dialog.modal('dispose');
                    this.$dialog.remove();
                    this.$dialog = null;
                    this.$content = null;
                    this.$footer = null;
                    this.$title = null;
                    $(document.body).removeClass('modal-open');
                    $('.modal:visible').length && $("#gametools-container").addClass('modal-open');
                    _self.getAppendedContainer(false, true);
                });
                this.$dialog.modal( { backdrop: false });
            });
        }
    }
    export class ReactInfoBox extends InfoBox {
        protected component: React.Component;
        protected addContentClass: boolean;
        constructor(protected jsxElement: JSX.Element, buttonText = "OK", delay = InfoBox.defaultDelay, style?: StylisticOptions) {
            super(null, "", buttonText, delay, style);
            this.component = null;
            this.addContentClass = true;
        }
        async reset() {
            this.component = null;
            await super.reset();
        }
        async _undisplay() {
            await super._undisplay();
            this.component = null;
        }
        async reactComponentUpdated() {

        }
        async dialogCreated() {
            this.$dialog.find(".modal-dialog").empty();
            await new Promise((resolve) => {
                this.doRenderReact(this.jsxElement, this.$dialog.find(".modal-dialog").get(0), async() => {
                    if(this.addContentClass) {
                        console.log("Adding content class");
                        let $container = this.$dialog.find(".modal-dialog").children();
                        $container.addClass("modal-content");
                        this.addContentClass = false;
                    }
                    await this.reactComponentUpdated();
                    resolve();
                });
            });
            await super.dialogCreated();
        }
    }
    export class Delay extends DisplayedItem {
        constructor(protected time: number) {
            super();
        }
        async display() {
            await super.display();
            setTimeout(() => {
                this.displayNext();
            }, this.time);
        }
    }
    export class LevelChoice extends InfoBox {
        constructor(protected levelMarkups: (GameValue<string>)[]) {
            super("Choose a level", "", null);
        }
        async dialogCreated() {
            this.$dialog.find(".modal-body").text("");
            let $container = $("<div></div>");
            $container.addClass("level-buttons");
            this.levelMarkups.forEach((element, index) => {
                
                let $button = $("<button></button>");
                DisplayedItem.getValue(this, element, $button.get(0));
                $button.data("level-id", index);
                $button.click(() => {
                    GameTools.currentLevel = $button.data("level-id");
                    this.$dialog.modal('hide');
                });
                $container.append($button);
            });
            this.$dialog.find(".modal-body").append($container);
        }
    }
    export function getRandomInt(min : number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    export function getRandomArbitrary(min: number, max: number): number {
        let val = Math.random() * (max - min) + min;
        return val;
    }
    export function playAudioIfSupported(audioFile: GameValue<string>, cb?: () => any): void {
        if(!cb)
            cb = function() {};
        if(Modernizr.audio) {
            var audio = new Audio(DisplayedItem.getValue(this, audioFile));
            audio.onerror = function() {
                cb();
            };
            audio.addEventListener("ended", cb);
            audio.play();
        } else
            cb();
    }
    interface LabelledItem extends GameTools.DisplayedItem {
        gt_label: string;
    }
    interface ContextualHelpItem extends GameTools.DisplayedItem {
        gt_help: string;
    }
    export class Label extends GameTools.DisplayedItem implements LabelledItem {
        public gt_label: string;
        constructor(name: GameValue<string> = "") {
            super();
            this.gt_label = DisplayedItem.getValue(this, name);
        }
        async display() {
            await super.display();
            this.displayNext();
        }
        private static lookup(array: GameArray, indexVal: GameValue<string>): number {
            let labels = array.filter(e => e instanceof Label);
            let theLabel: number = null;
            labels.some((e, index) => {
                let label = (e as Label);
                if(label.gt_label == DisplayedItem.getValue(null, indexVal)) {
                    theLabel = array.indexOf(label);
                    return true;
                }
                return false;
            });
            return theLabel;
        }
        public static lookupItem(array: GameArray, indexVal: GameValue<string>): number {
            let val = DisplayedItem.getValue(null, indexVal);
            let label: number = Label.lookup(array, val);
            if(label != null)
                return label;
            let theItem: number = null;
            array.some((e, index) => {
                if((e as LabelledItem).gt_label !== undefined && (e as LabelledItem).gt_label == val) {
                    theItem = index;
                    return true;
                }
                return false;
            });
            return theItem;
        }
    }
    export interface LoopInfo {
        index: GameValue<number | string>;
        relative?: boolean;
    }
    export class Loop extends GameTools.DisplayedItem {
        
        private numLoops = 0;
        constructor(public loopInfo: LoopInfo, public times = -1) {
            super();
            if(typeof this.loopInfo.index == "number" && this.loopInfo.index < 0)
                this.loopInfo.relative = true;
            else if(this.loopInfo.relative === undefined)
                this.loopInfo.relative = true;
        }
        addLoop(): void {
            this.numLoops--;
            if(this.numLoops < -1)
                this.numLoops = -1;
        }
        getNumTimesLooped(): number {
            return this.numLoops;
        }
        async display() {
            await super.display();
            if(this.times < 0 || this.numLoops < this.times) {
                var indexVal = DisplayedItem.getValue(this, this.loopInfo.index);
                if(typeof indexVal == "number") {
                    if(this.loopInfo.relative && this.myIndex() == -1)
                        throw "Not in gameContents array, cannot use relative branch";
                    if(!this.loopInfo.relative)
                        this.getParentArray().contentsIndex = indexVal;
                    else
                    this.getParentArray().contentsIndex += indexVal;
                } else {
                    let theItem: number = Label.lookupItem(this.getParentArray(), indexVal);
                    console.log("Index = " + theItem);
                    if(theItem == null)
                        throw "Undefined label: " + indexVal;
                    this.getParentArray().contentsIndex = theItem;
                }
                this.getParentArray().contentsIndex -= 1;
                this.numLoops++;
            }
            if(this.times < 0)
                this.numLoops = 0;
            this.displayNext();
        }
        async reset() {
            this.numLoops = 0;
            await super.reset();
        }
    }
    function constructLoop(loopInfo: LoopInfo, times = -1) {
        return new Loop(loopInfo, times);
    }
    export class SystemReset extends GameTools.DisplayedItem {
        async display() {
            await super.display();
            GameTools.resetSystem(this.getParentArray());
            this.displayNext();
        }
    }
    export async function resetSystem(array: GameArray) {
        for(let index = 0; index < array.length; index++) {
            const item = array[index];
            if(isDisplayedItem(item))
                await item.reset();
        }
    }
    export async function restart(array: GameArray, shouldInitialize = false) {
        
        if(array.contentsIndex != undefined) {
            const item = array[array.contentsIndex];
            if(isDisplayedItem(item) && item.isDisplaying()) {
                await item.undisplay();
            }
        }
        if(!array.initialized || shouldInitialize)
            initializeArray(array);

        let item = await toDisplayedItem(array[array.contentsIndex], array);
        await item.display();
    }
    export interface DragTargetsQuestionItem {
        target?: GameValue<string>;
        name: GameValue<string>;
    }

    function cancelTooltipTimeout($target: JQuery): void {
        var timeout = $target.data("tooltip-timeout");
        if(timeout) {
            clearTimeout(timeout);
            $target.removeData("tooltip-timeout");
        }
    }
    export function HSLToHex(h,s,l) {
        s /= 100;
        l /= 100;
      
        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = l - c/2,
            r: string | number = 0,
            g: string | number = 0,
            b: string | number = 0;
      
        if (0 <= h && h < 60) {
          r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
          r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
          r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
          r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
          r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
          r = c; g = 0; b = x;
        }
        // Having obtained RGB, convert channels to hex
        r = Math.round((r + m) * 255).toString(16);
        g = Math.round((g + m) * 255).toString(16);
        b = Math.round((b + m) * 255).toString(16);
      
        // Prepend 0s, if necessary
        if (r.length == 1)
          r = "0" + r;
        if (g.length == 1)
          g = "0" + g;
        if (b.length == 1)
          b = "0" + b;
      
        return "#" + r + g + b;
    }
    export function getContrastYIQ(hexcolor){
        hexcolor = hexcolor.replace("#", "");
        var r = parseInt(hexcolor.substr(0,2),16);
        var g = parseInt(hexcolor.substr(2,2),16);
        var b = parseInt(hexcolor.substr(4,2),16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    }
    export class DragTargetsQuestion extends InfoBox {
        static alwaysBeRight = false;
        constructor(protected title: GameValue<string>, protected items: DragTargetsQuestionItem[], protected shuffleTargets = false, protected shuffleOptions = false, protected allowMultiple = false, delay = InfoBox.defaultDelay) {
            super(title, "", "Check", delay);
        }
        buttonCallback(e: JQuery.ClickEvent): void {
            var $itemsDiv = this.$dialog.find(".modal-body .items-div");
            var $targetsDiv =  this.$dialog.find(".modal-body .targets-div");

            var $targets = $targetsDiv.find(".target");
            GameTools.lastResult = true;
            if(!DragTargetsQuestion.alwaysBeRight) {
                $targets.each((index, element): false | void => {
                    const myName = $(element).find("span").text();
                    let containedItems = new Set<string>();
                    this.items.forEach((item) => {
                        if(item.target !== undefined && item.target == myName) {
                            containedItems.add(DisplayedItem.getValue(this, item.name));
                        }
                    });
                    $(element).children().each((index, child): false | void => {
                        if(!$(child).hasClass("drag-item")) {
                            return; /* Skip question mark and span */
                        }
                        let childText = $($(child).children().get(0)).text();
                        if(!containedItems.has(childText)) {
                            GameTools.lastResult = false;
                            return false;
                        } else {
                            containedItems.delete(childText);
                        }
                    });
                    if(GameTools.lastResult == false)
                        return false;
                    if(containedItems.size > 0) {
                        GameTools.lastResult = false;
                        return false;
                    }
                });
            }

            super.buttonCallback(e);
        }
        async dialogCreated() {
            var $targetsDiv = $("<div></div>");
            var $itemsDiv = $("<div></div>");
            var $bothDivs =  $targetsDiv.add($itemsDiv);
            var $containerDiv = $("<div></div>").append($bothDivs);
            $containerDiv.css({
                "display": "flex",
                "width": "100%",
                "height": "100%"
            });
            this.$dialog.find(".modal-body").append($containerDiv);
            
            $bothDivs.addClass("dragtargets-div");
            $targetsDiv.addClass("targets-div");
            $itemsDiv.addClass("items-div");
            const targetNames = new Map<string, HTMLElement>();
            this.items.forEach(item => {
                const target = item.target;
                let $targetDiv = null;
                if(target != null && target != undefined) {
                    if(!targetNames.has(DisplayedItem.getValue(this, target))) {
                        let $span = $("<span></span>");
                        DisplayedItem.getValue(this, target, $span.get(0));
                        let $div = $("<div></div>").append($span).addClass("target");
                        $div.data("my-text", target);
                        $targetsDiv.append($div);
                        $div.append($("<i></i>").addClass("fas fa-question-circle").click(function() {
                            var $target = $(this).parent();
                            cancelTooltipTimeout($target);
                            $target.tooltip('show');
                            $target.data("tooltip-timeout", setTimeout(() => {
                                $target.tooltip('hide');
                            }, 3000));
                        }));
                        $div.children("i").hide();
                        targetNames.set(DisplayedItem.getValue(this, target), $div.get(0));
        
                        $targetDiv = $div;
                        
                        
                        $targetDiv.attr("title", $targetDiv.data("my-text"));
                        $targetDiv.tooltip({
                            html: true
                        });
                        $targetDiv.tooltip('disable');
                    } else {
                        $targetDiv = $(targetNames.get(DisplayedItem.getValue(this, target)));
                    }
                }
                const backColor = HSLToHex(getRandomInt(0, 360), 100, 90);
                let $div = $("<div></div>").addClass("drag-item").data("target", $targetDiv).css({
                    "background-color": backColor,
                    "color": getContrastYIQ(backColor)
                });
                let $tmpDiv = $("<div></div>").css("margin", "auto");
                DisplayedItem.getValue(this, item.name, $tmpDiv.get(0));
                $div.append($tmpDiv);
                $itemsDiv.append($div);
            });
            if(this.shuffleTargets)
                ($targetsDiv as any).randomize();
            if(this.shuffleOptions)
                ($itemsDiv as any).randomize();
             
            let gtBeforeDropFunction = function (event, ui) {
                console.log("gt before drop");
                if($(this).hasClass("target")) {
                    $(this).tooltip('enable');
                    $(this).children("i").show();
                    $(this).children("span").hide();
                }
            };
            let displayedItem = this;
            let outFunction = function (event, ui) {
                console.log("out");
                if($(this).hasClass("target") && $(this).children(".drag-item").hasClass("ui-draggable-dragging")) {
                    console.log($(this).children().get(0));
                    $(this).children("i").hide();
                    $(this).children("span").show();
                    $(this).tooltip('disable');
                }
            };
            let dropFunction = function( event, ui ) {
                $(this).trigger("gt.before_drop");
                let $draggable = $(document).find(".ui-draggable-dragging");
                if(!$draggable.get(0)) {
                    $draggable = $(this).children(".drag-item");
                    if(!$draggable.get(0)) {
                        throw "Can't find draggable";
                    }
                }
                console.log($draggable[0]);
                $draggable.css({
                    "top": "",
                    "left": ""
                });
                var $newParent = $(this);
                let isTeleporting = false;
                if(!displayedItem.allowMultiple && ($(this).hasClass("target") && $(this).find(".drag-item").length != 0) && !$draggable.equals($(this).find(".drag-item"))) {
                    $newParent = $itemsDiv;
                    isTeleporting = true;
                    
                }
                $draggable.detach().appendTo($newParent);
                if($newParent.is($itemsDiv))
                    $draggable.css({ "position": "relative"});
            };
            let dragInfo: JQueryUI.DraggableOptions = {
                containment: $("body"),
                start: function (event, ui) {
                    $(ui.helper).css({ "transform": "none"});
                    $(this).data("startingScrollTop",$(this).parent().scrollTop());
                    
                },
                revert: function (droppable) {
                    if(!droppable) {
                        console.log("Reverting!");
                        $(this).parent().trigger("gt.before_drop");
                        return true;
                    } else
                        return false;
                },
                drag: function (event, ui) {
                    if($(ui.helper).parent().hasClass("target")) {
                        $(ui.helper).parent().tooltip("hide");
                        cancelTooltipTimeout($(ui.helper).parent());
                    }
                },
                stop: function (event, ui) {
                    $(ui.helper).css({ "transform": ""});
                },
                scroll: true
            };
            console.log("should scroll");
            $targetsDiv.children("div").droppable().on("drop", dropFunction).on("dropout", outFunction).on("gt.before_drop", gtBeforeDropFunction);
            $itemsDiv.droppable().on("drop", dropFunction).on("dropout", outFunction);
            $itemsDiv.children("div").draggable(dragInfo);
        }
    }
    export class Condition extends DisplayedItem {
        constructor(public trueStatement: DisplayedItem, public falseStatement: DisplayedItem, public customCondition?: GameValue<boolean>) {
            super();
            if(this.customCondition === undefined)
                this.customCondition = function() {
                    return GameTools.lastResult;
                };
        }
        async display() {
            await super.display();
            if(DisplayedItem.getValue(this, this.customCondition))
                this.trueStatement.display();
            else
                this.falseStatement.display();
        }
        async reset() {
            await super.reset();
            this.trueStatement.setParentArray(this.getParentArray());
            this.falseStatement.setParentArray(this.getParentArray());
            this.trueStatement.myIndex = this.myIndex.bind(this);
            this.falseStatement.myIndex = this.myIndex.bind(this);
            if(this.trueStatement)
                await this.trueStatement.reset();
            if(this.falseStatement)
                await this.falseStatement.reset();
        }
    }
    export class InteractiveSVG extends InfoBox {
        protected $svgContainer: JQuery<HTMLDivElement>;
        protected svgElement: SVGElement;
        constructor (title: GameValue<string>, public imgSrc: GameValue<string>, public interactiveComponents?: GameValue<string>[]) {
            super(title, "", null);
        }
        static scrollHandler(): void {
            var scrollLeft = ($(".interactive-svg img").width() - $(".interactive-svg").width()) / 2;
            $(".interactive-svg").scrollLeft(scrollLeft);
        }
        interactiveComponentClicked($component: JQuery<Element>): void {
            GameTools.lastData = $component;
            this.displayNext();
        }
        protected makeInteractive($component: JQuery<Element>): void {
            $component.addClass("interactive-component");
            $component.click((e) => {
                this.interactiveComponentClicked(($(e.target) as JQuery<Element>));
            });
        }
        async dialogCreated() {
            await super.dialogCreated();
            await new Promise((resolve) => {
                this.$svgContainer = $("<div></div>");
                this.$svgContainer.addClass("interactive-svg");
                this.$svgContainer.load(DisplayedItem.getValue(this, this.imgSrc), () => {
                    this.svgElement = (this.$svgContainer.find("svg").get(0) as Element as SVGElement);
                    let loadCallback = () => {
                        if(this.interactiveComponents)
                            this.interactiveComponents.forEach((selector, index) => {
                                var svg = this.svgElement;
        
                                let elements = svg.querySelectorAll(DisplayedItem.getValue(this, selector));
                                elements.forEach(element => {
                                    $(element).addClass("interactive-component");
                                    $(element).click((e) => {
                                        this.interactiveComponentClicked(($(e.target) as JQuery<Element>));
                                    });
                                });
                            });
                        resolve();
                    };
                    loadCallback();
                });
                this.$dialog.find(".modal-body").append(this.$svgContainer);
                $(window).off("resize", InteractiveSVG.scrollHandler);
                $(window).on("resize", InteractiveSVG.scrollHandler);
            });
        }
        async _undisplay() {
            await super._undisplay();
            $(window).off("resize", InteractiveSVG.scrollHandler);
        }
    }
    interface FinderLinkedItem<DisplayType = GameValue<string>> {
        button: DisplayType;
        link: GameArrayItem;
    }
    type FinderTemplate = (itemsFound: number, totalItems: number) => string;
    export class Finder {
        public itemsFound: number;
        private itemIndexes: any[] = [];
        public static defaultTemplate(itemsFound: number, totalItems: number) {
            return `You have found ${itemsFound} of ${totalItems} items.`;
        }
        public $componentFound: JQuery;
        constructor(public parent: InfoBox, public numItems: number, public template: FinderTemplate = Finder.defaultTemplate) {
            this.reset();
        }
        reset(): void {
            this.itemIndexes = [];
            this.itemsFound = 0;
        }
        setTitle(): void {
            if(this.itemsFound > 0)
                this.parent.$dialog.find(".modal-title").text(this.template(this.itemsFound, this.numItems));
        }
        static isLinkedItem<T>(item: FinderItem<T>): item is FinderLinkedItem<T> {
            if(item == undefined || item == null)
                return false;
            let b_item = item as FinderLinkedItem<T>;
            return (b_item.button != undefined && b_item.link != undefined);
        }
        async itemFound($component: JQuery<any>): Promise<boolean> {
            
            if(this.itemIndexes.indexOf($component.data("index")) == -1) {
                this.itemsFound++;
                this.itemIndexes.push($component.data("index"));
            }
            this.$componentFound = $component;
            const element: FinderItem = $component.data("element");
            return new Promise(async(resolve) => {
                if(Finder.isLinkedItem(element)) {
                    let item: DisplayedItem = await toDisplayedItem(element.link, null);
                    item.displayNext = (async function(){
                        await this.undisplay();
                    }).bind(item);
                    item.once("undisplay", () => {
                        this.parent.displayNext();
                        resolve(false);
                    });
                    item.display();
                } else {
                    this.parent.displayNext();
                    resolve(false);
                }
            });
        }
        finished(): boolean {
            return this.itemsFound == this.numItems;
        }
    }
    export class InteractiveSVGFinder extends InteractiveSVG {
        finder: Finder;
        constructor(title: GameValue<string>, public imgSrc: GameValue<string>, interactiveComponents: (GameValue<string>)[], public numItems: number) {
            super(title, imgSrc, interactiveComponents);
            this.finder = new Finder(this, numItems);
        }
        public itemsFound = 0;
        interactiveComponentClicked($component: JQuery<SVGElement>): void {
            GameTools.lastData = $component;
            this.finder.itemFound($component);
        }
        async reset() {
            if(this.finder != null)
                this.finder.reset();
            await super.reset();
        }
    }
    type FinderItem<T = GameValue<string>> = (T|FinderLinkedItem<T>);
    export class ButtonFinder extends InfoBox {
        finder: Finder;
        didDisplay = false;
        foundIndexes: number[];
        closeButtonShown: boolean;
        constructor(title: GameValue<string>, public instructions: GameValue<string>, public buttons: FinderItem[], public delay = InfoBox.defaultDelay, protected userTemplate: FinderTemplate = Finder.defaultTemplate) {
            super(title, instructions, null, delay);
            this.finder = new Finder(this, buttons.length, this.finderTemplate.bind(this));
            this.foundIndexes = [];
        }
        protected finderTemplate(itemsFound: number, totalItems: number): string {
            let userString = this.userTemplate(itemsFound, totalItems);
            if(!this.closeButtonShown)
                return userString;
            return userString + " You can now close the dialog.";
        }
        async reset() {
            if(this.finder != null)
                this.finder.reset();
            await super.reset();
            this.foundIndexes = [];
            this.didDisplay = false;
            this.closeButtonShown = false;
        }
        async displayNext() {
            GameTools.lastResult = this.finder.finished();
            GameTools.lastData = this.finder.$componentFound.data("index");
            await super.displayNext();
        }
        async display() {
            await super.display();
            if(this.finder.finished()) {
                this.didDisplay = false;
                await this.displayNext();
            } else {
                this.didDisplay = true;
            }
        }
        async dialogCreated() {
            var $body = this.$dialog.find(".modal-body");
            $body.html("");
            $body.show();

            if(this.instructions != null) {
                let $span = $("<span></span>");
                DisplayedItem.getValue(this, this.instructions, $span.get(0));
                $body.append($span);
            }
                
            this.finder.setTitle();
            var $finderButtons = $("<div></div>").addClass("finder-buttons").appendTo($body);
            this.buttons.forEach((element, index) => {
                var $button = $("<button></button>");
                if(!Finder.isLinkedItem(element))
                    DisplayedItem.getValue(this, element, $button.get(0));
                else
                    DisplayedItem.getValue(this, element.button, $button.get(0));
                if(this.foundIndexes.indexOf(index) != -1) {
                    $button.addClass("was_found");
                }
                $button.data("index", index);
                $button.data("element", element);
                $button.click(async(e) => {
                    $finderButtons.children("button").prop("disabled", true);
                    this.foundIndexes.push($(e.target).data("index"));
                    if(await this.finder.itemFound($(e.target))) {
                        $finderButtons.children("button").prop("disabled", false);
                        await this.dialogCreated();
                        if(this.finder.finished()) {
                            console.log("Adding close button");
                            this.addCloseButton();
                            this.closeButtonShown = true;
                            this.finder.setTitle();
                        }
                    }
                });
                $finderButtons.append($button);
            });
        }
    }
    export function imageAndText(imgSrc: GameValue<string>, text: GameValue<string>): string {
        return "<img src='" + imgSrc + "'></img>" + text;
    }
    export class TrueFalseQuestion extends InfoBox {
        constructor(question: GameValue<string>, protected correctAnswer?: boolean) {
            super(question, null, "True");
        }
        buttonCallback(e: JQuery.ClickEvent): void {
            const isTrue = $(e.target).text() == "True";
            if(this.correctAnswer !== undefined) {
                GameTools.lastResult = isTrue == this.correctAnswer;
            } else
                GameTools.lastResult = isTrue;
           
            super.buttonCallback(e);
        }
        async dialogCreated() {
            var $footer = this.$dialog.find(".modal-footer");
            $footer.append($("<button></button>").addClass("btn btn-secondary").text("False").click(this.buttonCallback));
        }
    }
    export interface QuestionOption {
        html: GameValue<string>;
        correct?: boolean;
        fn?: () => any;
    }
    export interface StylisticOptions {
        shouldColorBackgrounds?: boolean;
        shouldShuffle?: boolean;
        showBackdrop?: boolean;
        forceShowClose?: boolean;
        customBackgroundClassList?: string|string[];
        customBodyClassList?: string|string[];
        useAsContainer?: boolean;
        showCorrectConfirmation?: boolean;
        onTop?: boolean;
        stripPunctuation?: boolean;
    }
    function colorBackground($element) {
        const backColor = HSLToHex(getRandomInt(0, 360), 100, 90);
        $element.css({
            "background-color": backColor,
            "color": getContrastYIQ(backColor)
        });
    }
    export enum QuestionType {
        MultipleChoice,
        FillInTheBlank
    }
    export function stripPunctuation(str: string): string {
        return str.replace(/[.,\/#!$'"%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").toLowerCase();
    }
    export class Question extends InfoBox {
        readonly isQuestion: boolean;
        constructor(protected type: QuestionType, question: GameValue<string>, protected choices: QuestionOption[], protected shouldReDisplay = true, style?: StylisticOptions, protected instructions: GameValue<string> = "") {
            super(question, "", Question.needsOKButton(type) ? "OK" : null, InfoBox.defaultDelay, style);
            this.isQuestion = choices.some((choice: QuestionOption) => {
                return choice.correct;
            });
        }
        public static needsOKButton(type: QuestionType): boolean {
            return (type == QuestionType.FillInTheBlank);
        }
        getDefaultStyle() {
            return { shouldShuffle: true };
        }
        buttonCallback(e: JQuery.ClickEvent) {
            if(this.type == QuestionType.FillInTheBlank) {
                $(e.target).prop("disabled", true);
                this.answered(this.$dialog.find(".modal-body").find("input"));
            }
        }
        isCorrect($button: JQuery<HTMLElement>, option: QuestionOption): boolean {
            if(this.type == QuestionType.MultipleChoice)
                return option.correct;
            else if(this.type == QuestionType.FillInTheBlank) {
                let text = $button.val() as string;
                let answer = DisplayedItem.getValue(null, option.html);
                if(this.objStyle.stripPunctuation) {
                    text = stripPunctuation(text);
                    answer = stripPunctuation(answer);
                }
                return text == answer;
            } else {
                throw new Error("Unsupported question type");
            }
        }
        async answered($button: JQuery<HTMLElement>) {
            let option: QuestionOption = $button.data("questionOption");
            if(option.fn !== undefined)
                await option.fn.call(option);
            GameTools.lastData = this.choices.indexOf(option);
            if(!this.isQuestion || this.isCorrect($button, option)) {
                GameTools.lastResult = true;
                if(this.objStyle.showCorrectConfirmation) {
                    this.$title.html(`That's right! The correct answer was ${option.html}.`);
                    if(this.type == QuestionType.MultipleChoice) {
                        $button.empty();
                        $button.addClass("disable-hover");
                        $button.append($("<i></i>").addClass("fas fa-check").css({
                            "font-size": "150%",
                            "color": "green"
                        }));
                    } else if(this.type == QuestionType.FillInTheBlank) {
                        $button.prop("disabled", true);
                    }
                    
                    await sleep(3000);
                }
                this.displayNext();
            } else {
                GameTools.lastResult = false;
                this.title = "Sorry, that wasn't the correct answer.";
                if(this.shouldReDisplay)
                    this.redisplay();
                else
                    this.displayNext();
            }
        }
        async display() {
            console.log("Button finder display()");
            await super.display();
        }
        async dialogCreated() {
            await super.dialogCreated();
            var $body = this.$dialog.find(".modal-body");
            let $instructionsDiv = $("<div></div>").appendTo($body);
            DisplayedItem.getValue(this, this.instructions, $instructionsDiv.get(0));
            if(this.type == QuestionType.MultipleChoice) {
                var $finderButtons = $("<div></div>").addClass("finder-buttons").appendTo($body);
                console.log("Button finder created");
                shuffle(this.choices, this.objStyle.shouldShuffle).forEach((element) => {
                    var $button = $("<button></button>");
                    DisplayedItem.getValue(this, element.html, $button.get(0));
                    if(this.objStyle.shouldColorBackgrounds)
                        colorBackground($button);
                    $button.data("index", this.choices.indexOf(element));
                    $button.data("questionOption", element);
                    $button.click(async (e) => {
                        $finderButtons.children("button").prop("disabled", true);
                        await this.answered($button);
                    });
                    $finderButtons.append($button);
                });
            } else if(this.type == QuestionType.FillInTheBlank) {
                $body.append($("<input/>").addClass("form-control").attr("type", "text").data("index", 0).data("questionOption", this.choices[0]));
                $body.append($("<small></small>").addClass("form-text text-muted").text("On a small screen? Consider solving the question on a piece of paper and then typing it in at the end."));
            } else {
                throw new Error("Unexpected question type");
            }
            
        }
    }
    export function isElement(obj: Node): boolean {
        try {
          //Using W3 DOM2 (works for FF, Opera and Chrome)
          return obj instanceof HTMLElement;
        }
        catch(e){
          //Browsers not supporting W3 DOM2 don't have HTMLElement and
          //an exception is thrown and we end up here. Testing some
          //properties that all elements have (works on IE7)
          return (typeof obj==="object") &&
            (obj.nodeType===1) && (typeof (obj as any).style === "object") &&
            (typeof obj.ownerDocument ==="object");
        }
    }
    export function monkeyPatch() {
        $(".preloader").fadeOut(() => $(".preloader").remove());
        // Setup our DOM elements
        const $gametools_wrapper = $("<div></div>").attr("id", "gametools-wrapper");
        $(document.body).append($gametools_wrapper);
        $gametools_wrapper.append($("<div></div>").attr("id", "top-bar"));
        $gametools_wrapper.append($("<div></div>").attr("id", "gametools-container"));
        $("#gametools-container").append($("<div></div>").addClass("background-img").attr("id", 'bk-im-0'));
        $("#gametools-container").append($("<div></div>").addClass("background-img").attr('id', 'bk-im-1'));
        $("#gametools-container").append($("<div></div>").addClass("gametools-overlay"));
        visibleStack = [];
        moment.updateLocale('en', {
            relativeTime : {
                past: function(input) {
                  return input === 'just now'
                    ? input
                    : input + ' ago';
                },
                s  : 'just now',
                future: "in %s",
                ss : '%d seconds',
                m:  "1m",
                mm: "%dm",
                h:  "1h",
                hh: "%dh",
                d:  "1d",
                dd: "%dd",
                M:  "a month",
                MM: "%d months",
                y:  "a year",
                yy: "%d years"
            }
        });
        $.widget("ui.draggable", ($.ui as any).draggable, {

            _mouseStart: function(event) {
              this._super(event);
              this.origScroll = this.options.scroll;
              if (this.cssPosition==="fixed" || this.hasFixedAncestor) {
                this.options.scroll = false;
              }
            },
        
            _mouseStop: function(event) {
              this._super(event);
              this.options.scroll = this.origScroll;
            }
        
        });
        $(document).on('hidden.bs.modal', '.modal', function () {
            $('.modal:visible').length && $(document.body).addClass('modal-open');
        });

        BrowserDetect.init();
        $(window).resize(handleResize);
    }
    async function handleResize() {
        for(let i = 0; i < visibleStack.length; i++) {
            await visibleStack[i].resize();
        }
    }
    export async function warnUser() {
        if(BrowserDetect.browser === 'Explorer') {
            $(document.body).addClass("this-is-ie");
            let box = new InfoBox("Attention!", "<p>This game is not heavily tested on Internet Explorer and may contain bugs/visual issues.</p>" +
                "<p>Please use a browser such as Pale Moon, Mozilla Firefox, or Google Chrome.</p>", "Continue anyways", 0);
            return new Promise((resolve) => {
                box.once("undisplay", () => resolve());
                box.display();
            });
        }
        return Promise.resolve();
    }
    interface BaseSwitchCase<T> {
        handler: (arg0: T) => any;
    }
    export interface DefaultSwitchCase<T> extends BaseSwitchCase<T> {
        default: boolean;
    }
    export interface SwitchCase<T> extends BaseSwitchCase<T> {
        caseValue?: T | T[];
    }
    export class Switch<T> extends DisplayedItem {
        constructor(protected value: GameValue<T>, protected cases: (DefaultSwitchCase<T> | SwitchCase<T>)[]) {
            super();
        }
        private static valueMatches<T>(caseVal: (T|T[]), rightVal: T): boolean {
            if(caseVal instanceof Array)
                return caseVal.some((val: T) => {
                    return val == rightVal;
                });
            else {
                return caseVal == rightVal;
            }
        }
        async display() {
            await super.display();
            let conditionVal: T = DisplayedItem.getValue(this, this.value);
            let defaultCase: DefaultSwitchCase<T> = null;
            let wasHandled: boolean;
            let shouldDisplayNext: boolean;
            await new Promise((resolve) => {
                asyncLib.some(this.cases, async(val: (SwitchCase<T>), callback) => {
                    if((val as DefaultSwitchCase<T>).default === undefined && Switch.valueMatches<T>(val.caseValue, conditionVal)) {
                        shouldDisplayNext = await (val as BaseSwitchCase<T>).handler(conditionVal);
                        callback(null, true);
                        return;
                    } else if((val as DefaultSwitchCase<T>).default === true) {
                        if(defaultCase != null)
                            throw "Multiple default cases";
                        else
                            defaultCase = (val as DefaultSwitchCase<T>);
                    }
                    callback(null, false);
                }, (err, result) => {
                    wasHandled = result;
                    resolve();
                });
            });
            
            if(!wasHandled && defaultCase != null) {
                shouldDisplayNext = await defaultCase.handler(conditionVal);
            }
            if(shouldDisplayNext == undefined || shouldDisplayNext == null)
                shouldDisplayNext = true; /* Will become false */

            shouldDisplayNext = !shouldDisplayNext;
            console.log("Exiting switch " + shouldDisplayNext);
            if(shouldDisplayNext)
                this.displayNext();
        }
    }
    export class Invoke extends DisplayedItem {
        constructor(protected fn: () => any) {
            super();
        }
        async display() {
            await super.display();
            await this.fn();
            this.displayNext();
        }
    }
    export class Event extends DisplayedItem {
        private waitingPromises: Function[];
        constructor() {
            super();
            this.waitingPromises = [];
        }
        public async waitFor() {
            await new Promise((resolve) => {
                this.waitingPromises.push(resolve);
            });
        }
        async display() {
            await super.display();
            this.displayNext();
        }
        public trigger(): void {
            this.waitingPromises.forEach((resolve) => resolve());
        } 
    }
    export class Call<T extends DisplayedItem> extends DisplayedItem {
        constructor(private fn: (item: T) => any, private labelName: GameValue<string>, private returnData = false) {
            super();
        }
        async display() {
            await super.display();
            var newData: any;
            if(this.labelName === null || this.labelName === undefined) {
                newData = await this.fn.call(null);
            } else {
                let itemIndex: number = Label.lookupItem(this.getParentArray(), this.labelName);
                if(itemIndex == null)
                    throw "Undefined label: " + this.labelName;
                let item = this.getParentArray()[itemIndex];
                newData = await this.fn.call(item, item);
            }
            if(this.returnData)
                GameTools.lastData = newData;
            this.displayNext();
        }
    }
    export function label(label: GameValue<string>): Label;
    export function label<T extends GameArrayItem = Label>(label: GameValue<string>, item?: T): LabelledItem&T;
    export function label<T extends GameArrayItem = Label>(label: GameValue<string> = "", item?: T): LabelledItem&T {
        if(item !== undefined) {
            let li = (item as unknown as LabelledItem);
            li.gt_label = DisplayedItem.getValue(this, label);
            return li as LabelledItem&T;
        } else {
            return new Label(label) as LabelledItem&T;
        }
        
    }
    export function help<T extends GameArrayItem>(item: T, help: GameValue<string>): ContextualHelpItem&T {
        let hi = (item as unknown as ContextualHelpItem);
        hi.gt_help = DisplayedItem.getValue(this, help);
        return hi as ContextualHelpItem&T;
    }
    export async function startDisplay(array: GameArray) {
        await GameTools.initializeArray(array);
        await GameTools.restart(array);
    }
    export function scope<T extends DisplayedItem>(array: GameValue<GameArray>, item: T): T {
        item.parentArray = DisplayedItem.getValue(this, array);
        return item;
    }
    export interface ListComponentProps{
        array: any[];
        listType: "ul" | "ol";
        itemClassName?: string;
        onClick?: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
    }
    export type NotebookItem = String&{
        noteBookLink?: GameArrayItem;
    };
    export function noteBookItem(itemName: String, noteBookLink?: GameArrayItem): NotebookItem {
        let item: NotebookItem = (new String(itemName) as NotebookItem);
        item.noteBookLink = noteBookLink;
        return item;
    }
    export class Notebook extends React.Component<{ title: string; notebookItems: Iterable<NotebookItem>; }> {
        notebookArray: Array<NotebookItem>;
        async itemOnClick(e: React.MouseEvent<HTMLLIElement, MouseEvent>) {
            let index = parseInt($(e.target).attr("data-index"));
            if(this.notebookArray[index].noteBookLink != undefined) {
                let item = await toDisplayedItem(this.notebookArray[index].noteBookLink, null);
                await item.display();
            }
        }
        render() {
            const { title, notebookItems, ...rest } = this.props;
            this.notebookArray = Array.from(notebookItems);
            return <div className="gametools-notebook" {...rest}>
                <div className="lines"></div>
                <ModalTitleBar title={this.props.title}/>
                <ul>
                    {this.notebookArray.map((item, index) => <li className={item.noteBookLink !== undefined ? "gt-notebook-clickable": ""} data-index={index} key={index} onClick={this.itemOnClick.bind(this)}>{item}</li>)}
                </ul>
                {this.props.children}
            </div>;
        }
    }
    export class ListComponent extends React.Component<ListComponentProps & React.HTMLProps<HTMLOListElement | HTMLUListElement>> {
        render() {
            const { array, listType, itemClassName, onClick, ...rest } = this.props;
            const ListType = listType;
            return <ListType {...rest as unknown}>
                {array.map((item, index) => <li className={itemClassName} onClick={onClick} data-index={index} key={index}>{item}</li>)}
            </ListType>;
        }
    }
    export interface ControlButtonProps {
        colorClass: string;
        icon?: string;
        name: string;
        onClick?: React.MouseEventHandler<HTMLButtonElement>;
    }
    interface ControlButtonState {
        onClick: React.MouseEventHandler<HTMLButtonElement>;
        disabled: boolean;
    }
    export class ControlButton extends React.Component<ControlButtonProps, ControlButtonState> {
        private buttonRef = React.createRef<HTMLButtonElement>();
        constructor(props) {
            super(props);
            let onClick = this.props.onClick;
            if(onClick == undefined) {
                onClick = () => {};
            }
            onClick = onClick.bind(this);
            this.state = { onClick: onClick, disabled: false };
            this.buttonClicked = this.buttonClicked.bind(this);
        }
        async buttonClicked(e) {
            this.setState({ disabled: true });
            await this.state.onClick(e);
            this.setState({ disabled: false });
        }
        render() {
            let iconElement = undefined;
            if(this.props.icon !== undefined)
                iconElement = <i className={this.props.icon}></i>;
            return <button disabled={this.state.disabled} onClick={this.buttonClicked} ref={this.buttonRef} title={this.props.name} className={"control-button btn " + this.props.colorClass}>{iconElement}</button>;
        }
        tooltipShown() {
            $(this.buttonRef.current).data("tooltipTimeout", setTimeout(() => {
                $(this.buttonRef.current).data("tooltipTimeout", null);
                $(this.buttonRef.current).tooltip('hide');
            }, 4000));
        }
        tooltipHide() {
            clearTimeout($(this.buttonRef.current).data("tooltipTimeout"));
        }
        componentDidMount() {
            $(this.buttonRef.current).tooltip({
                container: 'body'
            });
            $(this.buttonRef.current).data("tooltipTimeout", null);
            $(this.buttonRef.current).on('shown.bs.tooltip', () => this.tooltipShown());
            $(this.buttonRef.current).on('hide.bs.tooltip', () => this.tooltipHide());
        }
        componentWillUnmount() {
            this.tooltipHide();
            $(this.buttonRef.current).tooltip('dispose');
            $(this.buttonRef.current).off('shown.bs.tooltip');
            $(this.buttonRef.current).off('hide.bs.tooltip');
        }
    }
    export function slugify(string: string): string {
        const a = 'àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;';
        const b = 'aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------';
        const p = new RegExp(a.split('').join('|'), 'g');
      
        return string.toString().toLowerCase()
          .replace(/\s+/g, '-') // Replace spaces with -
          .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
          .replace(/&/g, '-and-') // Replace & with 'and'
          .replace(/[^\w\-]+/g, '') // Remove all non-word characters
          .replace(/\-\-+/g, '-') // Replace multiple - with single -
          .replace(/^-+/, '') // Trim - from start of text
          .replace(/-+$/, ''); // Trim - from end of text
    }
    export interface InfoPageItem {
        name: GameValue<string>;
        info: GameValue<string>;
    }
    export class InfoPage extends React.Component<{ pages: InfoPageItem[]; }> {
        navRef: React.RefObject<HTMLElement>;
        getPageFromSlug(slug: string, allowNull = false): InfoPageItem {
            let page: InfoPageItem = null;
            this.props.pages.some((pageItem) => {
                if(slugify(DisplayedItem.getValue(null, pageItem.name)) == slug) {
                    page = pageItem;
                    return true;
                }
                return false;
            });
            if(!allowNull && page == null)
                throw new Error("No page found for slug: " + slug);
            return page;
        }
        getPageInfo(routeProps) {
            return <ReactGameValue val={this.getPageFromSlug(routeProps.match.params.id).info}/>;
        }
        componentDidMount() {
            let body = $(this.navRef.current).parent();
            body.addClass("gt-infopage");
            body.parent().addClass("gt-infopage-modal-content");
        }
        render() {
            let pageLinks: JSX.Element[] = [];
            this.props.pages.forEach((page) => {
                let value = DisplayedItem.getValue(null, page.name);
                pageLinks.push(<NavTab className="nav-link" activeClassName="active" to={"/" + slugify(value)}>{value}</NavTab>);
            });
            this.navRef = React.createRef();
            return <Router>
                <nav ref={this.navRef} className="gt-infopage-navbar navbar navbar-expand-sm w-100 overflow-auto align-items-end">
                    <ListComponent array={pageLinks} listType="ul" className="navbar-nav nav-fill w-100 nav-tabs d-flex flex-row align-items-end align-content-end" itemClassName="nav-item" />
                </nav>
                <div className="info-page-info">
                    <Route path="/:id" render={routeProps => this.getPageInfo(routeProps)}/>
                </div>
            </Router>;
        }
    }
    export function ModalCloseButton(props) {
        return <button type="button" className="close" aria-label="Close" {...props}><span aria-hidden="true">&times;</span></button>;
    }
    export class ModalTitleBar extends React.Component<{ title?: string; showClose?: boolean; }> {
        render() {
            let closeButton;
            if(this.props.showClose != false)
                closeButton = <ModalCloseButton/>;
            return <div className="modal-header">
                <h5 className="modal-title">{this.props.title}</h5>
                {closeButton}
            </div>;
        }
    }
    export interface NewspaperArticle {
        headline: GameValue<string>;
        subhead?: GameValue<string>;
        content: GameValue<string>;
    }
    export function ReactGameValue(props: {val: GameValue<string>;}) {
        if(React.isValidElement(props.val)) {
            return (props.val as JSX.Element);
        }
        return <>{DisplayedItem.getValue(this, props.val)}</>;
    }
    export function NewspaperFigure(props: { src: string; caption?: string }) {
        return <figure className="media">
            <div className="figure-img">
                <img src={props.src} alt={props.caption}/>
            </div>
            <figcaption>{props.caption}</figcaption>
        </figure>;
    }
    export class Newspaper extends React.Component<{ paperName: GameValue<string>; subhead?: GameValue<string>; articles: NewspaperArticle[]; }> {
        private static importedCss = false;
        constructor(props) {
            super(props);
        }
        render() {
            return <div className="newspaper">
                <div className="head modal-header">
                    <div className="newspaper-headline"><ReactGameValue val={this.props.paperName}/></div>
                    <ModalCloseButton/>
                </div>
                <div className="subhead">
                <ReactGameValue val={this.props.subhead}/>
                </div>
                <div className="content">
                    <div className="columns">
                    {this.props.articles.map((article, index) => <div key={index} className="column">
                        <div className="head">
                            <span className="headline hl3"><ReactGameValue val={article.headline}/></span>
                            <p></p>
                            <span className="headline hl4"><ReactGameValue val={article.subhead}/></span>
                        </div>
                        {article.content}
                    </div>)}
                    </div>
                </div>
            </div>;
        }
        
    }
    export interface DialogueAction {
        character: GameValue<"you" | "them">;
        statements: GameValue<string>|GameValue<string>[];
    }
    export function classify(ugly: string): string {
        var step1 = ugly.replace(/^[^-_a-zA-Z]+/, '').replace(/^-(?:[-0-9]+)/, '-');
        var step2 = step1 && step1.replace(/[^-_a-zA-Z0-9]+/g, '-');
        return step2;
    }
    export class JumpingDots extends React.Component<{ ref: React.Ref<JumpingDots> }> {
        render() {
            return <div className="rcw-response">
                <div className="rcw-message-text">
                    <div className="jumping-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                </div>
            </div>;
        }
    }
    export function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    export class MomentWrapper extends React.Component<MomentProps, { date: string|number|Array<string|number|object>|object}> {
        constructor(props) {
            super(props);
            this.state = { date: props.date };
        }
        render() {
            const { date, ...rest } = this.props;
            return <Moment date={this.state.date} {...rest}/>;
        }
    }
    interface RequiredString extends String {
        required: (true|undefined);
    }
    export class DialogueWidgetWrapper extends React.Component<any, { showCloseButton: boolean; }> {
        constructor(props) {
            super(props);
            this.state = { showCloseButton: props.showCloseButton };
        }
        render() {
            const { showCloseButton, ...rest} = this.props;
            return <Widget showCloseButton={this.state.showCloseButton} {...rest}/>;
        }
    }
    export enum MessageSender {
        Player,
        Character
    }
    export interface UserFunctionTable {
        [funcName: string]: () => void;
    }
    export class DialogueExperience extends ReactInfoBox {
        protected currentStatement;
        protected lastSeenTime: Date;
        protected momentRef: React.RefObject<MomentWrapper>;
        protected mustAskAll: boolean;
        protected asked: Set<string>;
        protected allMessages: string[];
        protected widgetRef: React.RefObject<DialogueWidgetWrapper>;
        public endDialogueWhenMessageFinishes: boolean;
        public static doReenableInput: boolean = false;
        public static readonly builtinMessages = [
        ];
        protected bot: RiveScript;
        async endDialogue() {
            await this.reset();
            this.displayNext();
        }
        public async sendMessage(reply: string, sender: MessageSender = MessageSender.Character) {
            await new Promise(async(resolve) => {
                let replies = reply.split('\n');
                for(let index = 0; index < replies.length; index++) {
                    if(replies[index].trim().length == 0)
                        continue;
                    if(sender == MessageSender.Character)
                        toggleMsgLoader();

                    if(!SPEED_HACK) {
                        if(sender == MessageSender.Character)
                            await sleep(replies[index].length*100);
                        else
                            await sleep(1000);
                    }
                    if(sender == MessageSender.Character) {
                        toggleMsgLoader();
                        addResponseMessage(replies[index]);
                    } else
                        addUserMessage(replies[index]);
                    if(!SPEED_HACK) {
                        await sleep(500);
                    }
                }
                resolve();
            });
        }
        public showCloseButton() {
            this.widgetRef.current.setState({ showCloseButton: true });
        }
        async handleNewUserMessage(newMessage) {
            toggleInputDisabled();
            await sleep(1000);
            console.log("Message converted to: " + newMessage);
            this.lastSeenTime = new Date();
            if(this.momentRef.current != null && this.momentRef.current != undefined)
                this.momentRef.current.setState({ date: this.lastSeenTime});
            let reply = await this.bot.reply("local-user", newMessage, this);
            // Now send the message throught the backend API
            await this.sendMessage(reply);
            
            this.asked.add(newMessage);
            let requiredQuestions = this.allowedMessages;
            let notDone = requiredQuestions.some((msg) => {
                console.log("Have we asked " + msg);
                return !this.asked.has(msg);
            });
            toggleInputDisabled();
            if(!notDone) {
                this.showCloseButton();
                if(this.allMessages.length == this.asked.size || this.endDialogueWhenMessageFinishes) {
                    toggleInputDisabled();
                    DialogueExperience.doReenableInput = true;
                }
            }
            
            
        }
        objectHelp(): string {
            return super.objectHelp() + "Chat with one of the characters in the game!<p></p>If you can't choose a message, the conversation may have ended (check for a close button in the top right of the chat widget).<hr/>";
        }
        constructor(protected riveFile: string, title?: string, avatar?: string, protected allowedMessages?: string[],
            protected messageFeeder?: (controller: DialogueExperience) => void, protected userFuncs: UserFunctionTable = {}) {
            super(null);
            this.lastSeenTime = new Date();
            this.mustAskAll = allowedMessages != undefined;
            const dateFilter = (d) => {
                return "Active " + d;
            };
            this.momentRef = React.createRef<MomentWrapper>();
            this.widgetRef = React.createRef<DialogueWidgetWrapper>();
            this.allMessages = DialogueExperience.builtinMessages.concat(allowedMessages);
            this.addContentClass = false;
            this.jsxElement = <DialogueWidgetWrapper ref={this.widgetRef} fullScreenMode={false}
                                      showCloseButton={allowedMessages == undefined}
                                      title={title}
                                      titleAvatar={avatar}
                                      profileAvatar={avatar}
                                      onCloseClick={this.endDialogue.bind(this)}
                                      subtitle={""} /* <MomentWrapper ref={this.momentRef} filter={dateFilter} fromNow date={this.lastSeenTime}/> */
                                      possibleMessages={this.allMessages}
                                      inputType={allowedMessages == undefined ? "text" : "dropdown"}
                                      handleNewUserMessage={this.handleNewUserMessage.bind(this)}/>;
        }
        async dialogCreated() {
            await super.dialogCreated();
            this.lastSeenTime = new Date();
            if(DialogueExperience.doReenableInput) {
                toggleInputDisabled();
                DialogueExperience.doReenableInput = false;
            }
            if(this.messageFeeder != undefined)
                this.messageFeeder(this);
        }
        async dialogDisplayed() {
            await super.dialogDisplayed();
        }
        async reset() {
            this.endDialogueWhenMessageFinishes = false;
            
            console.log("Dropping messages");
            dropMessages();
            this.currentStatement = 0;
            this.asked = new Set<string>();
            this.lastSeenTime = new Date();
            this.bot = new RiveScript({
                concat: "newline"
            });
            if(this.riveFile != null && this.riveFile != undefined) {
                await this.bot.loadFile([
                    this.riveFile,
                    require('./components/chat/builtin.rive')
                ]);
            }

            console.log("Sorting!");
            this.bot.sortReplies();
            await super.reset();
        }
    }
    export class ImageDisplay extends InfoBox {
        constructor(protected src: string) {
            super("", "<img src='" + src + "'/>");
        }
        async dialogCreated() {
            super.dialogCreated();
            let $img = this.$content.find("img");
            $img.addClass("gt-image-display mfp-popup-wrapper");
            ($img as any).magnificPopup({
                items: {
                    src: this.src
                },
                type: 'image'
            });
        }
    }
    export class HelpButton extends React.PureComponent<ControlButtonProps, { visible: boolean }> {
        constructor(props) {
            super(props);
            this.state = { visible: false };
        }
        componentDidMount() {
            helpShown = true;
            DisplayedItem.updateHelp(this);
        }
        componentWillUnmount() {
            helpShown = false;
        }
        render() {
            const { onClick, ...rest } = this.props;
            const items = (this.state.visible) ?
                <GameTools.ControlButton onClick={() => {
                    const topItem = visibleStack[visibleStack.length - 1] as ContextualHelpItem;
                    setTimeout(async() => {
                        let box = new class extends InfoBox {
                            async dialogCreated() {
                                await super.dialogCreated();
                                this.$content.addClass("gt-help-body");
                            }
                        }("Information", topItem.getHelp(), "OK", 0);
                        await box.display();
                    }, 0);
                }} {...rest}/>
            : null;
            return items;
        }
    }
    export class HoleFinder extends InfoBox {
        modal_content: JQuery<HTMLElement>;
        images: JQuery<HTMLElement>;
        imageIndex: number;
        isAnimating: boolean;
        observer: IntersectionObserver;
        currentRatio: number;
        currentImage: HTMLImageElement;
        shouldContinue: boolean;
        allowClicks: boolean;
        holeFinder: JQuery<HTMLElement>;
        startTime: number;
        constructor(protected randomImages: string[], protected customClasses = "", protected hasCorrect = true, protected somethingElseString = "Try something else") {
            super(null, null, null);
        }
        newIndex() {
           this.imageIndex = getRandomInt(0, this.randomImages.length - 1);
        }
        async reset() {
            await super.reset();
            this.newIndex();
            this.isAnimating = false;
            this.allowClicks = true;
            this.currentRatio = 0;
            this.currentImage = null;
            this.shouldContinue = false;
        }
        stopAnimation() {
        }
        async _undisplay() {
            this.shouldContinue = false;
            this.stopAnimation();
            await super._undisplay();
        }
        objectHelp(): string {
            return super.objectHelp() + "You are looking for a certain object. When you see it, click to take a picture of it!<p></p>If you choose the wrong object or your picture isn't clear enough, you'll be prompted to take another one.<hr/>";
        }
        async animateNextImage() {
            await sleep(2000);
            let $image = $("<div></div>").css("background-image", `url(${this.randomImages[this.imageIndex]})`).attr("data-index", this.imageIndex);
            $image.css("z-index", getRandomInt(1, 15));
            this.images.append($image);
            let dimension = this.holeFinder.outerWidth();
            let invert = getRandomInt(0, 1) == 1 ? 1 : -1;
            $image.css("scaleX", invert.toString());
            $image.show();
            this.isAnimating = true;
            this.currentImage = $image.get(0) as HTMLImageElement;
            this.observer.observe(this.currentImage);
            const completeCallback = () => {
                this.isAnimating = false;
                if(this.currentImage != null)
                    this.observer.unobserve(this.currentImage);
                this.currentImage = null;
                this.currentRatio = 0;
                $image.remove();
                if(this.shouldContinue)
                    this.animateNextImage();
            };
            
            $image.addClass("hole-finder-animate");
            this.startTime = Date.now();
            console.log("start " + this.startTime);
            setTimeout(completeCallback, 1000);
            
            this.newIndex();
        }
        static removeImageBlanks(imageObject: HTMLImageElement) {
            let imgWidth = imageObject.width;
            let imgHeight = imageObject.height;
            var canvas = document.createElement('canvas');
            canvas.setAttribute("width", imgWidth.toString());
            canvas.setAttribute("height", imgHeight.toString());
            var context = canvas.getContext('2d');
            context.drawImage(imageObject, 0, 0);
        
            var imageData = context.getImageData(0, 0, imgWidth, imgHeight),
                data = imageData.data,
                getRBG = function(x, y) {
                    var offset = imgWidth * y + x;
                    return {
                        red:     data[offset * 4],
                        green:   data[offset * 4 + 1],
                        blue:    data[offset * 4 + 2],
                        opacity: data[offset * 4 + 3]
                    };
                },
                isWhite = function (rgb) {
                    // many images contain noise, as the white is not a pure #fff white
                    return rgb.opacity == 0;
                },
                        scanY = function (fromTop) {
                var offset = fromTop ? 1 : -1;
        
                // loop through each row
                for(var y = fromTop ? 0 : imgHeight - 1; fromTop ? (y < imgHeight) : (y > -1); y += offset) {
        
                    // loop through each column
                    for(var x = 0; x < imgWidth; x++) {
                        var rgb = getRBG(x, y);
                        if (!isWhite(rgb)) {
                            if (fromTop) {
                                return y;
                            } else {
                                return Math.min(y + 1, imgHeight - 1);
                            }
                        }
                    }
                }
                return null; // all image is white
            },
            scanX = function (fromLeft) {
                var offset = fromLeft? 1 : -1;
        
                // loop through each column
                for(var x = fromLeft ? 0 : imgWidth - 1; fromLeft ? (x < imgWidth) : (x > -1); x += offset) {
        
                    // loop through each row
                    for(var y = 0; y < imgHeight; y++) {
                        var rgb = getRBG(x, y);
                        if (!isWhite(rgb)) {
                            if (fromLeft) {
                                return x;
                            } else {
                                return Math.min(x + 1, imgWidth - 1);
                            }
                        }      
                    }
                }
                return null; // all image is white
            };
        
            var cropTop = scanY(true),
                cropBottom = scanY(false),
                cropLeft = scanX(true),
                cropRight = scanX(false),
                cropWidth = cropRight - cropLeft,
                cropHeight = cropBottom - cropTop;
        
            canvas.setAttribute("width", cropWidth.toString());
            canvas.setAttribute("height", cropHeight.toString());
            // finally crop the guy
            canvas.getContext("2d").drawImage(imageObject,
                cropLeft, cropTop, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight);
        
            return canvas.toDataURL();
        }
        static async cropImageURL(url: string) {
            let img = document.createElement('img');
            img.src = url;
            return new Promise((resolve) => {
                img.onload = function() {
                    resolve(HoleFinder.removeImageBlanks(img));
                };
            });
        }
        async dialogCreated() {
            await super.dialogCreated();
            this.allowClicks = true;
            this.modal_content = this.$content.parent();
            this.modal_content.empty();
            this.modal_content.css({
                "background-color": "transparent",
                "border": "none",
                "justify-content": "center",
                "align-items": "center",
                "box-shadow": "none"
            });
            let holeFinderContainer;
            this.modal_content.append(holeFinderContainer = $("<div></div>").addClass("hole-finder-container"));
            holeFinderContainer.append(this.holeFinder = $("<div></div>"));
            this.holeFinder.addClass("hole-finder " + this.customClasses);
            
            const bubbleContainer = $("<div></div>").addClass("bubble-container");
            this.holeFinder.append(bubbleContainer);
            for(var i = 0; i < 50; i++) {
                bubbleContainer.append($("<span class='bubble'></span>"));
            }
            
            this.images = $("<div></div>").addClass("hole-finder-images");
            this.holeFinder.append(this.images);
            let options = {
                root: this.images.get(0),
                rootMargin: '0px',
                threshold: 1.0
            };
            this.observer = new IntersectionObserver((entries) => {
                if(entries.length > 1)
                    console.error("Not expecting multiple entries (" + entries.length + ")");
                this.currentRatio = entries[entries.length - 1].intersectionRatio;
            }, options);
            window.requestAnimationFrame(() => {
                this.shouldContinue = true;
                setTimeout(() => {
                    this.animateNextImage();
                }, 0);
                
            });
            this.holeFinder.on('click', () => {
                if(!this.allowClicks)
                    return;
                this.allowClicks = false;
                let foundItem = false;
                let errorMessage = "";
                const diff = (Date.now()-this.startTime);
                if(diff >= 350 && diff <= 850) {
                    let index = parseInt(this.currentImage.getAttribute("data-index"));
                    if(this.hasCorrect && index == 0) {
                        foundItem = true;
                    } else
                        errorMessage = "That isn't what we're looking for. Try again.";
                } else
                    errorMessage = "It doesn't look like this picture will be useful.<p></p>Remember that the whole object needs to be within the lens.<p></p>Try again.";
                if(foundItem) {
                    this.displayNext();
                    return;
                }

                

                const _self = this;
                let customInfoBox = class extends InfoBox {
                    async dialogCreated() {
                        await super.dialogCreated();
                        if(!_self.hasCorrect)
                            this.$footer.append($("<button></button>").addClass("btn btn-secondary").html(_self.somethingElseString).addClass("gt-hole-something-else"));
                    }
                    buttonCallback(e: JQuery.ClickEvent) {
                        if($(e.target).hasClass("gt-hole-something-else")) {
                            this.once("undisplay", () => _self.displayNext());
                        }
                        super.buttonCallback(e);
                    }
                };
                let infoBoxMade = async(infoBox: InfoBox) => {
                    await infoBox.display();
                };
                domtoimage.toPng(this.holeFinder.get(0), {
                    style: {
                        boxShadow: "none"
                    }
                }).then(async(dataUrl) => {
                    dataUrl = await HoleFinder.cropImageURL(dataUrl);
                    let infoBox = new customInfoBox("Hmm...", "<img class='gt-preview-image' src='" + dataUrl + "'/><hr/>" + errorMessage, "OK", 0);
                    await infoBoxMade(infoBox);
                    this.allowClicks = true;
                }, async(reason) => {
                    console.error(reason);
                    let infoBox = new customInfoBox("Hmm...", errorMessage, "OK", 0);
                    await infoBoxMade(infoBox);
                    this.allowClicks = true;
                });
            });
        }
    }
    export async function waitForIndex(array: GameArray, index: number) {
        while(true) {
            if(array.contentsIndex == index)
                return;
            await new Promise((resolve) => {
                array.indexPollers.push(resolve);
            });
        }
    }
    export class SetBackground extends DisplayedItem {
        static nextIndex = 0;
        public static readonly duration = 2000;
        constructor(protected newsrc: GameValue<string>, protected customClasses: GameValue<string> = "") {
            super();
        }
        getImg(): JQuery<HTMLElement> {
            return $("#gametools-container .background-img");
        }
        async reset() {
            await super.reset();
        }
        hideImage($img: JQuery<HTMLElement>) {
            $img.removeClass("show");
            $img.removeClass($img.attr("data-customClasses"));
        }
        async display() {
            await super.display();
            let $img = this.getImg();
            if($img.length == 0) {
                throw new Error("Cannot find background image object. Perhaps you forgot to monkey patch?");
            }
            if(this.newsrc != null) {
                let bgImg = new Image();
                bgImg.onload = () => {
                    $("#gametools-container").addClass("bkgd-shown");
                    this.hideImage($($img.get(SetBackground.nextIndex ^ 1)));
                    window.requestAnimationFrame(() => {
                        $($img.get(SetBackground.nextIndex)).addClass("show");
                        SetBackground.nextIndex ^= 1;
                        this.displayNext();
                    });
                    $($img.get(SetBackground.nextIndex)).css("background-image", 'url(' + bgImg.src + ')');
                    const cc = DisplayedItem.getValue(null, this.customClasses);
                    $img.attr("data-customClasses", cc);
                    $img.addClass(cc);
                };
                bgImg.src = DisplayedItem.getValue(this, this.newsrc);
            } else {
                $("#gametools-container").removeClass("bkgd-shown");
                $($img.get(SetBackground.nextIndex ^ 1)).css("background-image", "none");
                this.hideImage($($img.get(SetBackground.nextIndex ^ 1)));
                this.displayNext();
            }
        }
    }
    export class BusinessCard extends InfoBox {
        numClicks: number;
        constructor(protected cardContents: GameValue<string>) {
            super(null, null, null);
        }
        async reset() {
            await super.reset();
            this.numClicks = 0;
        }
        async dialogCreated() {
            await super.dialogCreated();
            const $button = $("<button></button>").addClass("business-card");
            DisplayedItem.getValue(this, this.cardContents, $button.get(0));
            this.$dialog.find(".modal-content").remove();
            this.$dialog.find(".modal-dialog").append($button);
            $button.on("click", (e) => {
                this.numClicks++;
                if(this.numClicks == 2) {
                    this.numClicks = 0;
                    this.buttonCallback(e);
                }
            });
            $button.on("blur", () => {
                $button.blur();
                this.numClicks = 0;
            });
        }
    }
    export class Branch extends Loop {
        async displayNext() {
            /* Do NOT call super.displayNext(), this will do nothing */
            let arr = this.getParentArray();
            arr.contentsIndex++; /* simulate DisplayedItem.displayNext() */
            setTimeout(async() => {
                let item = await toDisplayedItem(arr[arr.contentsIndex], arr);
                item.display();
            }, 0);
        }
        async display() {
            await super.display();
        }
    }
    export function markdown_img(src: string, alt = "no_alt") {
        return `![${alt}](${src})`;
    }
    export function toDataURI(svg_html: string|SVGElement): string {
        if(svg_html instanceof SVGElement)
            svg_html = svg_html.outerHTML;
        const externalQuotesValue = "double";
        const quotes = getQuotes();
        const symbols = /[\r\n%#()<>?\[\\\]^`{|}]/g;
        function addNameSpace( data ) {
            if ( data.indexOf( 'http://www.w3.org/2000/svg' ) < 0 ) {
                data = data.replace( /<svg/g, `<svg xmlns=${quotes.level2}http://www.w3.org/2000/svg${quotes.level2}` );
            }
        
            return data;
        }
        function encodeSVG( data ) {
            // Use single quotes instead of double to avoid encoding.
            if ( externalQuotesValue === 'double') {
                data = data.replace( /"/g, '\'' );
            }
            else {
               data = data.replace( /'/g, '"' );
            }
        
            data = data.replace( />\s{1,}</g, "><" );
            data = data.replace( /\s{2,}/g, " " );
        
            return data.replace( symbols, encodeURIComponent );
        }
        
        
        // Get quotes for levels
        //----------------------------------------
        
        function getQuotes() {
            const double = `"`;
            const single = `'`;
        
            return {
                level1: externalQuotesValue === 'double' ? double : single,
                level2: externalQuotesValue === 'double' ? single : double
            };
        }
        return "data:image/svg+xml," + encodeSVG(addNameSpace(svg_html));
    }
    export function patchSVGLayers(svg: SVGElement, visibleLayers?: string[]) {
        if(visibleLayers == undefined || visibleLayers == null || visibleLayers.length == 0)
            return;
        let svgGroups = svg.querySelectorAll('g');
        svgGroups.forEach((group) => {
            let groupMode = group.getAttribute('inkscape:groupmode');
            if(groupMode != "layer")
                return;
            let layerName = group.getAttribute("inkscape:label");
            if(layerName != null && layerName != "") {
                if(visibleLayers.indexOf(layerName) == -1)
                    group.setAttribute("visibility", "hidden");
            }
        });
    }
    export function magnify(img: JQuery<HTMLElement>) {
        img.addClass("gt-preview-image mfp-popup-wrapper");
        (img as any).magnificPopup({
            items: {
                src: img.attr("src")
            },
            type: 'image'
        });
    }
    export class ZoomableSVG extends React.Component<{ src: string; visibleLayers?: string[]; extraClasses?: string; style?: React.CSSProperties; }, {svg_html: string; }> {
        imgRef: React.RefObject<HTMLDivElement>;
        constructor(props) {
            super(props);
            this.state = { svg_html: null };
            this.imgRef = React.createRef();
        }
        makeMagnific(img, add = true) {
            if(img == null)
                return;
            if(add) {
                let svg = $(img).find("svg").get(0) as SVGElement;
                patchSVGLayers(svg, this.props.visibleLayers);
                try {
                    let str = new XMLSerializer().serializeToString(svg);
                    console.log("Successfully serialized");
                    let deserialized = new DOMParser().parseFromString(str, "text/xml");
                    console.log("Successfully deserialized");
                } catch(e) {
                    /* Probably IE having a fit */
                    console.log("Detected SVG load failure, bailing");
                    $(img).removeClass("gt-preview-image gt-svg-preview-image mfp-popup-wrapper");
                    return;
                }
                const uri = toDataURI($(img).html());
                ($(img) as any).magnificPopup({
                    items: {
                        src: uri
                    },
                    type: 'image'
                });
            } else {
                $(img).off('click');
                $(img).removeData('magnificPopup');
            }
            
        }
        componentDidMount() {
            this.makeMagnific(this.imgRef.current);
        }
        componentWillUnmount() {
            this.makeMagnific(this.imgRef.current, false);
        }
        componentDidUpdate() {
            this.makeMagnific(this.imgRef.current);
        }
        render() {
            if(this.state.svg_html != undefined && this.state.svg_html != null)
                return <div style={this.props.style} ref={this.imgRef}
                    className={"gt-preview-image gt-svg-preview-image mfp-popup-wrapper " + (this.props.extraClasses == undefined ? "" : this.props.extraClasses)}
                    dangerouslySetInnerHTML={{ __html: this.state.svg_html}}></div>;
            else {
                $.get(this.props.src, (data) => {
                    this.setState({ svg_html: data });
                }, "text");
                return null;
            }
        }
    }
    export function caesarShift(str: string, amount: number): string {

        // Wrap the amount
        if (amount < 0)
            return caesarShift(str, amount + 26);
    
        // Make an output variable
        var output = '';
    
        // Go through each character
        for (var i = 0; i < str.length; i ++) {
    
            // Get the character we'll be appending
            var c = str[i];
    
            // If it's a letter...
            if (c.match(/[a-z]/i)) {
    
                // Get its code
                var code = str.charCodeAt(i);
    
                // Uppercase letters
                if ((code >= 65) && (code <= 90))
                    c = String.fromCharCode(((code - 65 + amount) % 26) + 65);
    
                // Lowercase letters
                else if ((code >= 97) && (code <= 122))
                    c = String.fromCharCode(((code - 97 + amount) % 26) + 97);
    
            }
    
            // Append
            output += c;
    
        }
    
        // All done!
        return output;
    
    }
    export function codeify(code: string) {
        code = code.toUpperCase();
        const punctRE = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g;
        return code.replace(punctRE, '');
    }
    export function appendToArray<T>(array: T[], item: T): T {
        array.push(item);
        return item;
    }
    export class AddToNotebook extends DisplayedItem {
        constructor(protected list: GameValue<Set<NotebookItem>>, protected items: (NotebookItem|Array<NotebookItem>), protected showItem?: boolean) {
            super();
        }
        async display() {
            let firstItem: GameArrayItem = null;
            let realList = DisplayedItem.getValue(null, this.list);
            if(Array.isArray(this.items)) {
                console.log("Is iterable");
                console.log(this.items);
                if(this.showItem == undefined)
                    this.showItem = false;
                this.items.forEach((item, index) => {
                    if(index == 0)
                        firstItem = item.noteBookLink;
                        realList.add(item);
                });
            } else {
                if(this.showItem == undefined)
                    this.showItem = true;
                    realList.add(this.items);
                firstItem = this.items.noteBookLink;
            }
            await super.display();
            console.log("Show: " + this.showItem);
            if(this.showItem && firstItem != null && firstItem != undefined) {
                let item = await toDisplayedItem(firstItem, this.getParentArray());
                item.displayNext = item.undisplay;
                item.once("undisplay", () => {
                    this.displayNext();
                });
                item.display();
            } else
                this.displayNext();
        }
    }
    export function pad(num: number, width: number, z?: string): string {
        z = z || '0';
        if(z.length != 1)
            throw new Error("Third parameter should be exactly one character.");
        let n: string = num + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    type RemoveFirstFromTuple<T extends any[]> = 
        T['length'] extends 0 ? undefined :
        (((...b: T) => void) extends (a, ...b: infer I) => void ? I : []);
    export function invokeOn<T, F extends (this: T, ...args: any) => any>(obj: T, fn: F, ...args: Parameters<F>): T {
        fn.call(obj, args);
        return obj;
    }
    export function pl_undef<T>(val: T, defaultVal: T, handleNull = false): T {
        let useDefault = false;
        if(val == undefined)
            useDefault = true;
        else if(handleNull && val == null)
            useDefault = true;
        if(useDefault)
            return defaultVal;
        else
            return val;
    }
    export class SpinningClock extends React.Component<{ startHourAngle?: number; startMinuteAngle?: number; startSecondAngle?: number;}> {
        render() {
            return <div className="clocks single local linear clock-fast">
                <article className="clock ios7 show">
                    <div className="hours-container">
                        <div className="hours angled" style={{transform: `rotateZ(${pl_undef(this.props.startHourAngle, 0)}deg`}}></div>
                    </div>
                    <div className="minutes-container">
                        <div className="minutes angled" style={{transform: `rotateZ(${pl_undef(this.props.startMinuteAngle, 0)}deg`}}></div>
                    </div>
                    <div className="seconds-container">
                        <div className="seconds angled" style={{transform: `rotateZ(${pl_undef(this.props.startSecondAngle, 0)}deg`}}></div>
                    </div>
                </article>
            </div>;
        }
    }
    export class TagStripperFragment extends React.Component<{ strippedTags: string[]; }> {
        domRef: React.RefObject<HTMLDivElement>;
        constructor(props) {
            super(props);
        }
        componentDidMount() {
            let div = this.domRef.current;
            this.props.strippedTags.forEach((tag) => {
                let items = div.querySelectorAll(tag);
                items.forEach((item) => {
                    item.replaceWith(...Array.from(item.childNodes));
                });
            });
        }
        render() {
            this.domRef = React.createRef();
            return <div ref={this.domRef}>{this.props.children}</div>;
        }
    }
    export class TitleScreen extends InfoBox {
        constructor() {
            super(null, "Test", "Start", 0);
        }
        async dialogCreated() {
            await super.dialogCreated();
            this.$content.html(`<h1 class="display-4">Welcome to ${document.title}!</h1>`);
            this.$content.append($("<h3 class='d-inline-block'></h3>").append($("<small></small>").addClass("text-muted").html("Need help during the game? Use this button when it appears:")));
            this.$content.append("<button disabled='disabled' class='control-button btn btn-info bs-enabled'><i class='fas fa-question'></i></button>");
            this.$footer.addClass("gt-ts-footer");
        }
    }
}

class CreatureCard extends GameTools.InfoBox {
    constructor(protected code: string, protected img: string, protected name: string, protected taxonomy: string, protected info: GameTools.GameValue<string>) {
        super("", "", "OK");
    }
    async dialogCreated() {
        this.$content.parent().addClass("creature-card");
        let modal_header = this.$title.parent();
        modal_header.empty();
        modal_header.html(this.code);
        let leftDiv = $("<div><h2>CREATURE CARDS</h2><h4>PACIFIC NORTHWEST SERIES</h4><img src='" + this.img + "'/></div>");
        let img = leftDiv.find("img");
        GameTools.magnify(img);
        this.$content.empty();
        this.$content.append(leftDiv);
        let rightDiv = $("<div></div>");
        rightDiv.append("<h4>" + this.name + "</h4><h5>" + this.taxonomy + "</h5>");
        const $infoDiv = $("<div></div>");
        GameTools.DisplayedItem.getValue(this, this.info, $infoDiv.get(0));
        rightDiv.append($infoDiv);
        this.$content.append(rightDiv);
    }
}

let notebookList = new Set<GameTools.NotebookItem>();
async function showNotebook(this: GameTools.ControlButton) {
    await new Promise((resolve) => {
        GameTools.startDisplay([ 
            new GameTools.ReactInfoBox(<GameTools.Notebook title="My Notebook" notebookItems={notebookList}/>, null, 0),
            new GameTools.Invoke(resolve)
        ]);
    });
    
}

let infoGuide: GameTools.InfoPageItem[] = [
    { name: "Food web", info: <GameTools.TagStripperFragment strippedTags={[ "a" ]}>
        <p>A <b>food web</b> is similar to a <a href="https://simple.wikipedia.org/wiki/Food_chain" title="Food chain">food chain</a> but larger. It's a <a href="https://simple.wikipedia.org/wiki/Diagram" title="Diagram">diagram</a> that combines many food chains into one picture. The diagram uses arrows to show the energy relationships among organisms. Food webs show how <a href="https://simple.wikipedia.org/wiki/Plant" title="Plant">plants</a> and <a href="https://simple.wikipedia.org/wiki/Animal" title="Animal">animals</a> are connected in many ways. The arrow points from the organism being eaten to the organism that eats it. </p>

        <p>A <b>food web</b> (or <b>food cycle</b>) is a natural interconnection of <a href="https://simple.wikipedia.org/wiki/Food_chain" title="Food chain">food chains</a>. The two extreme categories (<a href="https://simple.wikipedia.org/w/index.php?title=Trophic_level&amp;action=edit&amp;redlink=1" title="Trophic level (not yet started)">trophic levels</a>) are: </p>

        <ol><li>the <a href="https://simple.wikipedia.org/wiki/Autotroph" title="Autotroph">autotrophs</a> (organisms that make their own food), and</li>
        <li>the <a href="https://simple.wikipedia.org/wiki/Heterotroph" title="Heterotroph">heterotrophs</a> (organisms that need other organisms for food).</li>
        </ol><p>A gradient exists: there are different kinds of feeding relations: <a href="https://simple.wikipedia.org/wiki/Herbivore" title="Herbivore">herbivory</a>, <a href="https://simple.wikipedia.org/wiki/Carnivore" title="Carnivore">carnivory</a>, <a href="https://simple.wikipedia.org/wiki/Scavenger" title="Scavenger">scavenging</a> and <a href="https://simple.wikipedia.org/wiki/Parasitism" title="Parasitism">parasitism</a>. </p>

        <p>Some of the organic matter eaten by heterotrophs, such as <a href="https://simple.wikipedia.org/wiki/Sugar" title="Sugar">sugars</a>, provides energy. Autotrophs and heterotrophs come in all sizes, from <a href="https://simple.wikipedia.org/wiki/Microscopic" title="Microscopic">microscopic</a> to many <a href="https://simple.wikipedia.org/wiki/Tonne" title="Tonne">tonnes</a> – from <a href="https://simple.wikipedia.org/wiki/Cyanobacteria" title="Cyanobacteria">cyanobacteria</a> to giant <a href="https://simple.wikipedia.org/wiki/Redwood" title="Redwood">redwoods</a>, and from <a href="https://simple.wikipedia.org/wiki/Virus" title="Virus">viruses</a> to <a href="https://simple.wikipedia.org/wiki/Blue_whale" title="Blue whale">blue whales</a>. </p>


    </GameTools.TagStripperFragment>},
    { name: "Bioaccumulation", info: <p><b>Bioaccumulation</b> is a process in which toxic substances (such as pesticides) accumulate in living organisms. This poses a threat to health, life, and the environment.</p>},
    { name: "Killer whale", info: <>
        <p>
        The killer whale or orca (Orcinus orca) is a toothed whale belonging to the oceanic dolphin family, of which it is the largest member.
        Killer whales have a diverse diet, although individual populations often specialize in particular types of prey.
        Some feed exclusively on fish, while others hunt marine mammals such as seals and other species of dolphin.
        They have been known to attack baleen whale calves, and even adult whales.
        Killer whales are apex predators, as no animal preys on them. A cosmopolitan species, they can be found in each of the world's oceans in a variety of marine environments.
        </p>
        <p>
        There are three general types of killer whales:
        <ol>
            <li><b>Resident</b>: These are the most commonly sighted of the three populations in the coastal waters of the northeast Pacific.
                Residents' diets consist primarily of fish and sometimes squid, and they live in complex and cohesive family groups called pods.</li>
            <li><b>Transient</b>: The diets of these whales consist almost exclusively of marine mammals.Transients generally travel in small groups, usually of two to six animals,
                and have less persistent family bonds than residents. Transients vocalize in less variable and less complex dialects</li>
            <li><b>Offshore</b>: A third population of killer whales in the northeast Pacific was discovered in 1988, when a humpback whale researcher observed them in open water.
                As their name suggests, they travel far from shore and feed primarily on schooling fish.
                However, because they have large, scarred and nicked dorsal fins resembling those of mammal-hunting transients,
                it may be that they also eat mammals and sharks.</li>
        </ol>
        </p>
    </>},
    { name: "Salmon", info: <>
        <p>Salmon is a kind of teleost fish. There are many different kinds of salmon. Salmon belong to the same family of fish as the trout. Most kinds of salmon live in salt water, or migrate between rivers and the sea. Many people like to eat salmon, so the fish is also grown in fish farms. </p>
        <p>Salmon are commonly preyed upon by seals, whales, and humans.</p>
        <p>A salmon's Latin name is "Oncorhynchus", meaning "hooked nose".</p>
    </>},
    { name: "Plankton", info: <>
        <p>The word "plankton" comes from the Greek word "planktos" which means "wanderer", and that's exactly what these creatures do!</p>
        <p>Plankton are drifting organisms that live in the surface layers of the ocean. They live in the top layer of the ocean, called the epipelagic zone. They are not strong enough to swim against ocean currents.</p>
        <p>Over 70% of the Earth's oxygen is produced by phytoplankton, which means that they play a big role in life as we know it.</p>
        <p>Some plankton contain toxins. People can die from these toxins if they eat plankton-eating animals like clams, mussels, or herring. Blue whales also eat plankton.</p>
        <p>Plankton are also used in inorganic manufacturing, i.e. to make chalk.</p>
    </>},
    { name: "Herring", info: <>
        <p>A herring is a small teleost fish of the genus Cluptea. Best-known of this family is probably the Atlantic Herring.
            There are 15 different species of herring. When herrings migrate in the water they usually do this in large numbers; this is then called a school of herring.
            Like other fish, they do this for protection.</p>
        <p>Herring are called suspension feeders, as they filter out organisms that are suspended in the water (like plankton) using special filters in their mouths.</p>
        <p>Humans usually catch herring to collect their eggs, which hinders their reproduction.</p>
        <p>Because herring are an important food source for salmon and seals, a drop in the population could be disastrous.</p>
    </>}
];
async function showFieldGuide(this: GameTools.ControlButton) {
    await new Promise((resolve) => {
        GameTools.startDisplay([ 
            new GameTools.InfoBox("Field Guide", <GameTools.InfoPage pages={infoGuide}>
            </GameTools.InfoPage>, null, 0, { forceShowClose: true }),
            new GameTools.Invoke(resolve)
        ]);
    });
}

import pacific_chat from "./external/pacific.rive";
import whale from './external/whale.svg';
import barrels from './external/barrels.png';
import seaweed from './external/seaweed.png';
import diver from './external/diver.svg';

let day1Newspaper = new GameTools.ReactInfoBox(<GameTools.Newspaper paperName="Routine Rambler" subhead="" articles={[
    {
        headline: "Odd Killer Whale Behavior",
        content: <>
            <GameTools.NewspaperFigure src={require('./external/images/killer_whale_pod.jpg')} caption="Killer whales are normally very family-oriented."/>
            Killer whales in the Awakataka Strait have been exhibiting odd behavior over the last several days.
            <p></p>
            Experts have noticed that the normally family-oriented whales have been wandering away from their pods.
            <p></p>
            Shocked by this news is Tall Teddy of Tall Teddy's Tasty Treats. When asked to comment on the situation, he said:
            <blockquote>Aw snap, I always thought the Awakataka was the healthiest biome in the world!</blockquote>
            An official study is yet to be conducted, but scientists report that it is not uncommon for sick animals
            to leave their groups like this.
        </>
    },
    {
        headline: "Martin Mersenich Spots Fearsome Creature!",
        subhead: <blockquote>This is 100% real!<footer>Martin Mersenich</footer></blockquote>,
        content: <>
           Martin Mersenich, a well-known figure in the community of Awakataka, has allegedly discovered what
           he believes to be the world's largest monster.
           <p></p>
           "This thing makes Frankenstein, Dracula, and all those other monsters look like breadcrumbs!" Mr. Mersenich said in an interview.
           <p></p>
           Critics of Mr. Mersenich state that he has rarely been able to provide proof for any of his discoveries.
        </>
    },
    {
        headline: "Fishnappers Jailed",
        content: <>
            Authorities have finally caught the fishnappers who were wanted in connection with the theft of David G. Flounder's fish from his palatial estate last month.
            <p></p>
            "It was all thanks to Anna Atlantic," Mr. Flounder announced at a press conference. "This is no ordinary fish."
            <p></p>
            When asked to comment by a <i>Routine Rambler</i> reporter on what unique qualities the fish had, Mr. Flounder boldly proclaimed that the fish could predict the
            future, build robots, and cook better than any other French chef out there.
        </>
    },
    {
        headline: "Bus Schedule Changes",
        content: <>
            Due to unforeseen circumstances, bus service for the town of Awakataka will be reduced to the following routes only over the next week:
            <ul>
                <li><b>Route 1:</b> Airport Rocket</li>
                <li><b>Route 24:</b> Teddy Service (will only serve stops up to and including Wiseguy Way)</li>
            </ul>
            <p></p>
            Awakataka Transit apologizes for any inconvenience this may cause.
        </>
    }
]}/>);

let day2Newspaper = new GameTools.ReactInfoBox(<GameTools.Newspaper paperName="Routine Rambler" articles={[
    {
        headline: "Tree Blocks Road to Airport",
        content: <>
            Residents of Awakataka will be unable to access the airport until very late this evening or tomorrow morning due
            to a large tree blocking the only road.
        </>
    },
    {
        headline: "Whale Population Being Tracked",
        content: <>
            The local marine research centre, PORPIS, has announced that the whale population mentioned in our last broadcast
            has been contaminated by a dangerous chemical. They believe that the whales are ingesting contaminated salmon.
            <p></p>
            When asked about who was investigating the case, a PORPIS spokesperson replied in an email:
            <blockquote>We at PORPIS are actively tracking the situation. Please stay tuned for further replies.</blockquote>
            <p></p>
            Martin Mersenich stated that he was "doubtful of PORPIS' efforts":
            <blockquote>PORPIS has no salmon facility, so they're going to stop working on this soon.
                It would be really nice if someone useful (a.k.a. <i>me</i>) was actually working on the case!</blockquote>
        </>
    }
]}/>);

let day3Newspaper = new GameTools.ReactInfoBox(<GameTools.Newspaper paperName="Routine Rambler" articles={[
    {
        headline: "Salmon Shakes are Here!",
        content: <>
            The wise and mysterious Dr. Salman Wise, Ph.D has announced his latest concoction, Salmon Shakes! When asked
            for further details, Dr. Wise replied:
            <p></p>
            <blockquote>With all of the hype about smoothies and eating healthier in general, I figured that using salmon
                in smoothies was a natural strategy.
            </blockquote>
            <p></p>
            Dr. Wise also mentioned that he has yet to receive any customers.
        </>
    },
    {
        headline: "BREAKING: Whale Contamination Case Update",
        content: <>
            Tremendous steps have been taken in the whale contamination case. The contaminant has been traced to a salmon population
            northeast of this island.
            <p></p>
            The <i>Routine Rambler</i> is still unsure at this time exactly who has been collecting all of this data.
            PORPIS has not returned any emails sent by our reporters.
            <p></p>
            Martin Mersenich assures citizens that there is no need to worry.
            <blockquote>
                I see little cause for alarm. There is lots to do around here, especially with the new Pancake Mansion
                opening tomorrow.
            </blockquote>
        </>
    }
]}/>);

let day4Newspaper = new GameTools.ReactInfoBox(<GameTools.Newspaper paperName="Routine Rambler" articles={[
    {
        headline: "Martin Mersenich Finds World's Largest Whale!",
        content: <>
            Martin Mersenich discovered what he believes to be the world's largest whale while playing beach volleyball.
            <p></p>
            When asked to comment, he said:
            <blockquote>
                I was playing with some pretty blind volleyball players. When I discovered the whale, they all turned
                their heads and basically let me score a free point!
            </blockquote>
            <p></p>
            The other players denied that there was any whale present during the game.
        </>
    },
    {
        headline: "Headway Made in Whale Contamination Case",
        content: <>
            PORPIS and its associated agencies are almost ready to reveal the cause of the recent whale contamination.
            <p></p>
            Captain Andrea Atkins of the S.S. Symphonica has announced that she is dedicating all of her staff and
            equipment to solving the remaining pieces of the puzzle.
            <p></p>
            When asked for his opinion, Martin Mersenich doubted that "any of these clowns" could solve the case.
            <blockquote>
                At this point, I'm pretty sure I know more about the situation than PORPIS or any of these other people.
                I could probably solve the case in a matter of seconds if I had the time.
            </blockquote>
            <p></p>
            Martin Mersenich also seemed to be in a hurry to leave during the interview.
        </>
    }
]}/>);

export function BusStop(props) {
    return <><img src={require('./external/images/bus-stop.svg')}/>{props.children}</>;
}

let shift = 12; /* Code shift */

let realCode = atob("VGhleSdsbCBuZXZlciBmaW5kIG15IHNlY3JldCBvciBJJ20gbm90IE1hcnRpbiBNZXJzZW5pY2gu");

let codedCode = GameTools.codeify(GameTools.caesarShift(realCode, shift));

function getEquivalentCodeLetter(letter: string): string {
    return `${letter}=${GameTools.caesarShift(letter, shift)}`;
}

let day1_notebookitems: GameTools.NotebookItem[] = [];
let day2_notebookitems: GameTools.NotebookItem[] = [];
let day3_notebookitems: GameTools.NotebookItem[] = [];
let day4_notebookitems: GameTools.NotebookItem[] = [];

let defaultChartOptions: Chart.ChartDataSets = {
    fill: false,
    lineTension: 0.4,
    borderCapStyle: 'butt',
    borderDash: [],
    borderDashOffset: 0.0,
    borderJoinStyle: 'miter',
    pointBorderWidth: 1,
    pointHoverRadius: 5,
    pointHoverBorderWidth: 2,
    pointRadius: 1,
    pointHitRadius: 10,
};

let day3_question = (isQuestion: boolean) => {
    let data: Chart.ChartData = {
        labels: (function() {
            let arr = [];
            for(var i = 6; i <= 18; i += 3) {
                arr.push(`${GameTools.pad(i, 2)}:00`);
            }
            return arr;
        })(),
        datasets: [
            Object.assign({}, defaultChartOptions, { label: 'Height', data: [ 2.4, 0.7, 0.7, 2.2, 2.9 ], yAxisID: 'height-axis' }),
        ]
    };
    if(isQuestion) {
        data.datasets.push(Object.assign({}, defaultChartOptions, { label: 'Salt Content', data: [ 3.4, 0.8, 0.5, 3.1, 3.5 ], yAxisID: 'salt-axis' }));
        data.datasets.push(Object.assign({}, defaultChartOptions, { label: 'Toxin Level', data: [ 1.2, 0.1, 0.0, 1.1, 1.5 ] }));
    }
    let opts: Chart.ChartOptions = {
        title: {
            display: true,
            text: "Tide Graph"
        },
        legend: {
            display: true
        },
        scales: {
            yAxes: [
                {
                    scaleLabel: {
                        display: true,
                        labelString: 'Height',
                    },
                    ticks: {
                        // Include a dollar sign in the ticks
                        callback: (value) => (value + 'm')
                    },
                    id: "height-axis",
                }
            ],
            xAxes: [
                {
                    scaleLabel: {
                        display: true,
                        labelString: 'Time'
                    }
                }
            ]
        },
        plugins: {
            colorschemes: {
                scheme: Aspect6
            }
        },
        tooltips: {
            mode: 'index'
        }
    };
    if(isQuestion)
        opts.scales.yAxes.push({
            scaleLabel: {
                display: true,
                labelString: 'Salt Content',
            },
            ticks: {
                // Include a dollar sign in the ticks
                callback: (value) => (value + 'ppt')
            },
            id: "salt-axis",
            position: 'right'
        });
    return <Line data={data} options={opts}/>;
};

const day3_help = "You can mouse over items on the chart to learn what data set they belong to.<hr/>";

let currentHint = 0;

let myArray = [
    new GameTools.Invoke(() => GameTools.warnUser()),
    new GameTools.SetBackground(require('./external/images/multiple_question_marks.svg'), "gt-background-tile"),
    new GameTools.TitleScreen(),
    GameTools.label("chapter_selection"),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Choose a chapter.", [
        { html: "Chapter 1" },
        { html: "Chapter 2" },
        { html: "Chapter 3" },
        { html: "Chapter 4" }
    ], false, { shouldColorBackgrounds: false, shouldShuffle: false, showCorrectConfirmation: false }),
    new GameTools.SystemReset(),
    new GameTools.Invoke(() => notebookList = new Set()),
    new GameTools.Loop({ index: () => "chapter" + (GameTools.lastData + 1)}),
    // ---------------------------- CHAPTER 1 --------------------------------
    GameTools.label("chapter1"),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    new GameTools.ButtonFinder("Explore Anna Atlantic's office!", "", [
        { button: <>
            <img src={require('./external/images/newspaper.svg')}/>
            Newspaper on table
        </>, link: day1Newspaper },
        { button: <>
            <img src={require('./external/images/business-card.svg')}/>
            Business card
        </>, link: new GameTools.BusinessCard(<>
            <div className="business-card-row clearfix">
                <div className="float-left business-card-big">(123)-777-PORP</div>
                <div className="float-right">
                    <p><span className="business-card-big">Pacific Ocean</span></p>
                    <p><span style={{fontSize: "80%"}} className="business-card-no-space">Research and Protection</span></p>
                    <p><span className="business-card-small business-card-no-space">Institute of Science</span></p>
                </div>
            </div>
            <div className="business-card-row">
                <p><span className="business-card-big">S</span>ri <span className="business-card-big">S</span>argasso</p>
                <p><span className="business-card-big">D</span>irector</p>
            </div>
            <div className="business-card-row">
                <span className="business-card-small">Trips to sea made daily. Phone to book.</span>
            </div>
        </>) }
    ], 0),
    new GameTools.Condition(GameTools.label(""), new GameTools.Loop({ index: -1 })),
    GameTools.label("", new GameTools.DialogueExperience(require('./external/atlantic.rive'), "Anna Atlantic", undefined, [
        "What are we solving today?",
        "Will we be working together?",
        "Where should I start?"
    ])),
    GameTools.label("day1_busstop"),
    new GameTools.SetBackground(require('./components/city.svg')),
    new GameTools.ButtonFinder("Choose a bus stop.", "", [
        <BusStop>Route 1</BusStop>,
        <BusStop>Route 24</BusStop>,
        <><img src={require('./components/back_button.svg')}/>Go back to Anna's office</>,
    ], GameTools.InfoBox.defaultDelay, () => "Choose a bus stop."),
    new GameTools.Switch<number>(() => GameTools.lastData, [
        { caseValue: 0, handler: () => GameTools.startDisplay([
            new GameTools.SetBackground(require('./external/images/airport.jpg')),
            new GameTools.InfoBox("Airport Closed", "There are no flights leaving the airport today."),
            () => new GameTools.Branch({ index: "day1_busstop"}).setParentArray(myArray)
        ]) },
        { caseValue: 1, handler: () => GameTools.startDisplay([
            new GameTools.SetBackground(require('./external/images/secure_building.svg')),
            new GameTools.InfoBox("Sign", "A sign outside a heavily secured and guarded building says that visitors are unwelcome today. But you spot something else..."),
            new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day1_notebookitems, GameTools.noteBookItem("Creature card", () => new CreatureCard(`${getEquivalentCodeLetter('A')} ${getEquivalentCodeLetter('B')}`, require('./external/images/stingray.jpg'), "Southern stingray", "Dasyatis americana", <p>
                The stingrays are a large suborder of the rays. They are cartilaginous fishes related to sharks.
                <br/>
                Most stingrays have one or more barbed stings on the tail, which is used only for self defending.
                The sting may reach about 35 cm, and its underside has two grooves with venom glands.
                The sting is covered with a thin layer of skin, the sheath, in which the venom is held.
                A few members of the suborder, such as the manta rays and the porcupine ray, do not have stings.
            </p>)))),
            () => new GameTools.Branch({ index: "day1_busstop"}).setParentArray(myArray)
        ]) },
        { caseValue: 2, handler: () => new GameTools.Branch({ index: "day1_porpis" }).setParentArray(myArray).display() },
    ]),
    GameTools.label("day1_porpis"),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    new GameTools.DialogueExperience(require('./external/porpis.rive'), "PORPIS", undefined, [
        "Why would the toxins cause problems?",
        "Can we find out what the whales eat?"
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hey!\nWe heard that you're trying to find out why the killer whale population is acting strange?");
        await controller.sendMessage("Yeah! I'm thinking that there might be some toxic barrels in the strait. Here's what they look like!", GameTools.MessageSender.Player);
        await controller.sendMessage(GameTools.markdown_img(require('./external/images/barrels.png')), GameTools.MessageSender.Player);
        await controller.sendMessage("Awesome! This picture will provide us with very valuable information!");
        await controller.sendMessage("These barrels could be releasing dangerous toxins into the ocean water, which could cause problems for the whales.");
        toggleInputDisabled();
    }),
    GameTools.label("foodweb_question"),
    new GameTools.DragTargetsQuestion("Drag <b>all</b> the items on the right to the appropriate targets on the left.", [
        { name: "Blue Whale", target: "What eats plankton?" },
        { name: "Herring", target: "What eats plankton?" },
        { name: "Seal", target: "What eats herring?" },
        { name: "Salmon", target: "What eats herring?" },
        { name: "Seal", target: "What eats salmon?" },
        { name: "Transient Killer Whale", target: "What eats seals?" },
        { name: "Resident Killer Whale", target: "What eats salmon?"},
    ], true, true, true, GameTools.InfoBox.defaultDelay),
    new GameTools.Condition(new GameTools.Loop({ index: "foodweb_correct"}), GameTools.label("")),
    new GameTools.InfoBox("Whoops!", "It looks like something wasn't quite right with that. Read your field guide carefully and try again!"),
    new GameTools.Loop({ index: "foodweb_question"}),
    GameTools.label("foodweb_correct"),
    new GameTools.DialogueExperience(null, "PORPIS", undefined, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("You must know what you're doing!\nLooks like you know enough to help us look for the contaminated whale population.\nThat way we can find the source of the toxins.\n");
        await controller.sendMessage("You'll be in charge of the camera.\nWhen you see a whale swimming past, click/touch/tap/do whatever you need to do to get a picture of it!");
        await controller.sendMessage("Let's get started as soon as possible! We don't have a lot of time...");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    GameTools.label('whale_finder'),
    new GameTools.SetBackground(null),
    new GameTools.HoleFinder([
        require('./external/images/whale.svg'),
        require('./external/images/seaweed.png'),
        require('./external/images/diver.svg'),
        require('./external/images/generic_fish.png'),
        require('./external/images/bottle.png')
    ], "water-hole-finder"),
    new GameTools.DialogueExperience(null, "PORPIS", undefined, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Nice work!\nWhen you get back to your office we should have the results ready.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    GameTools.label('found_whale'),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Which of these whale pods has the highest level of contamination?", [
        { html: "Pod A" },
        { html: "Pod B", correct: true },
        { html: "Pod C" }
    ], true, undefined, <GameTools.ZoomableSVG src={require('./external/images/map.svg')} visibleLayers={[ "Basemap", "Layer 1"]}/>),
    new GameTools.DialogueExperience(null, "PORPIS", undefined, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Yep, the pod that the whale you discovered belongs to seems to be the most contaminated.");
        await controller.sendMessage("It looks like your theory may be right.");
        await controller.sendMessage("We need to find those barrels as soon as possible, before they contaminate more animals.");
        await controller.sendMessage("One more thing: can you answer another question for us?");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "What do resident killer whales eat?", [
        { html: "Seals" },
        { html: "Salmon", correct: true },
        { html: "Plankton" }
    ]),
    new GameTools.DialogueExperience(null, "PORPIS", undefined, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("That's right.\nToo bad we at PORPIS don't have a salmon facility.");
        await controller.sendMessage("Wait!\nThere's this salmon expert that I know from a long way back, Dr. Salman Wise.");
        await controller.sendMessage("Let me give you his contact information.\nHe can probably help you, if you can talk to him...");
        await controller.sendMessage("Also, I have this card that your boss, Anna, gave to me a while ago. Maybe it would be useful.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    GameTools.label("firstCreatureCard"),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day1_notebookitems, GameTools.noteBookItem("Creature card", () => new CreatureCard(`${getEquivalentCodeLetter('Y')} ${getEquivalentCodeLetter('Z')}`, require('./external/images/sunflowerstar.jpg'), "Sunflower star", "Pycnopedia helianthoides", <p>
        The sunflower star is a large sea star found in the northeast Pacific. The only species of its genus, it is among the largest sea stars in the world (but not quite the largest),
        with a maximum arm span of 1 m (3.3 ft). Sunflower sea stars usually have 16 to 24 limbs; their color can vary widely. They are predatory, feeding mostly on sea urchins,
        clams, snails, and other small invertebrates. Although the species had been widely distributed throughout the northeast Pacific, its population has rapidly declined since 2013.
    </p>)))),
    GameTools.label("finalday1chat"),
    new GameTools.DialogueExperience(require('./external/atlantic.rive'), "Anna Atlantic", undefined, [
        "I talked to PORPIS, and we think that the barrels are contaminating the local salmon.",
        "We think this is linked to the whales that the news was talking about this morning.",
        "It's getting late. I should go.",
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hey Ace! How's it going?");
        toggleInputDisabled();
    }, {
        "getMessage": () => codedCode
    }),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day1_notebookitems, GameTools.noteBookItem("Coded message", () => new GameTools.InfoBox("Coded message", "<p>The code is:</p><p><b>" + codedCode + "</b></p>"))), false),
    new GameTools.Loop({ index: "chapter_selection" }),
    // ---------------------------- CHAPTER 2 --------------------------------
    GameTools.label("chapter2"),
    new GameTools.Invoke(() => notebookList = new Set()),
    new GameTools.AddToNotebook(() => notebookList, day1_notebookitems),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    new GameTools.ButtonFinder("Explore Anna Atlantic's office!", "", [
        { button: <>
            <img src={require('./external/images/newspaper.svg')}/>
            Newspaper on table
        </>, link: day2Newspaper },
        { button: <>
            <img src={require('./external/images/business-card.svg')}/>
            Business card
        </>, link: new GameTools.BusinessCard(<>
            <div className="business-card-row clearfix">
                <div className="float-left business-card-big">1-800-WISEGUY</div>
            </div>
            <div className="business-card-row">
                <p><span className="business-card-big">D</span>r <span className="business-card-big">S</span>alman <span className="business-card-big">W</span>ise, <span className="business-card-big">P</span>h.D </p>
            </div>
            <div className="business-card-row">
                <span className="business-card-small">Expert on all things salmon. Phone to book a meeting.</span>
            </div>
        </>) },
        { button: <>
            <img src={require('./external/images/creature_card.svg')}/>
            Creature card
        </>,
        link: new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day2_notebookitems, GameTools.noteBookItem("Creature card", () => new CreatureCard(`${getEquivalentCodeLetter('Q')} ${getEquivalentCodeLetter('R')}`, require('./external/images/pacific_scallop.jpg'), "Pacific pink scallop", "Chlamys hastata", <p>
            Pacific pink scallops are part of a large class of molluscs, also known as pelecypods.
            <br/>
            They have a hard calcareous shell made of two parts or 'valves'. The soft parts are inside the shell. The shell is usually bilaterally symmetrical.
            <br/>
            Scallops and file clams can swim to escape a predator, clapping their valves together to create a jet of water.
        </p>))))
        }
    ], 0),
    new GameTools.Condition(GameTools.label(""), new GameTools.Loop({ index: -1 })),
    GameTools.label("day2_busstop"),
    new GameTools.SetBackground(require('./components/city.svg')),
    new GameTools.ButtonFinder("Choose a bus stop.", "", [
        <BusStop>Route 1</BusStop>,
        <BusStop>Route 24</BusStop>,
        <><img src={require('./components/back_button.svg')}/>Go back to Anna's office</>,
    ], GameTools.InfoBox.defaultDelay, () => "Choose a bus stop."),
    new GameTools.Switch<number>(() => GameTools.lastData, [
        { caseValue: 0, handler: () => GameTools.startDisplay([
            new GameTools.SetBackground(require('./external/images/road.svg')),
            new GameTools.InfoBox("Road Closed", "Due to a fallen tree ahead, this bus will not serve the airport."),
            () => new GameTools.Branch({ index: "day2_busstop"}).setParentArray(myArray)
        ]) },
        { caseValue: 1, handler: () => new GameTools.Branch({ index: "day2_wise" }).setParentArray(myArray).display() },
        { caseValue: 2, handler: () => GameTools.startDisplay([
            new GameTools.SetBackground(require('./external/images/office.svg')),
            new GameTools.DialogueExperience(null, "PORPIS", undefined, [
            ], async(controller) => {
                toggleInputDisabled();
                await controller.sendMessage("This is an automated response.\nThe PORPIS team is busy and unable to respond to your messages at this time.");
                GameTools.DialogueExperience.doReenableInput = true;
                controller.showCloseButton();
            }),
            () => new GameTools.Branch({ index: "day2_busstop"}).setParentArray(myArray)
        ]) },
    ]),
    GameTools.label("day2_wise"),
    new GameTools.SetBackground(require('./external/images/secure_building_guarded.svg')),
    new GameTools.InfoBox("Security guards", <>
        <p>Soooo... you want to talk to Dr. Wise?</p>
        <p>Well, we might let you in... if you pass this fun facts quiz.</p>
        <p>If you are confused, you may need to do some research.</p>
    </>),
    GameTools.label("day2_wisequiz"),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Oncorhynchus means...", [
        { html: "hook-nose", correct: true },
        { html: "color-changing" },
        { html: "needs to perform again" }
    ], true),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Most salmon have an anadromous lifestyle, meaning...", [
        { html: "They live in freshwater and saltwater, but breed in saltwater", correct: true },
        { html: "They mate with fish they've never seen before" },
        { html: "They live in freshwater and saltwater, but breed in freshwater" }
    ], true),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "What is an alevin?", [
        { html: "A small chipmunk with a squeaky voice" },
        { html: "A tiny salmon right after it hatches", correct: true },
        { html: "A nest of salmon eggs" }
    ]),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "The early freshwater phase of the coho salmon can be as long as...", [
        { html: "Three weeks" },
        { html: "Two years", correct: true },
        { html: "The time it takes to eat one of Tall Teddy's Tasty Treats" }
    ]),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Parr marks help salmon...", [
        { html: "Blend in with the gravel", correct: true },
        { html: "Play golf", },
        { html: "Attract mates" }
    ]),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Chinook salmon can jump as high as..", [
        { html: "Three meters", correct: true },
        { html: "One meter", },
        { html: "The height of Niagara Falls" }
    ]),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "How many eggs can a sockeye salmon lay?", [
        { html: "4000", correct: true },
        { html: "40", },
        { html: "400" }
    ]),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Chum salmon are also known as...", [
        { html: "Dog salmon", correct: true },
        { html: "Friendly salmon", },
        { html: "Kettle salmon" }
    ]),
    GameTools.label("day2_quizpassed"),
    new GameTools.InfoBox("Security guards", <>
        <p>Hahahahaha.</p>
        <p>You may have passed the quiz... but we're not letting you in to this place. Why? Because you asked to speak to "Salman Wise", not <b><i>Dr.</i></b> Salman Wise.</p>
        <p><b>We think it's time for you to leave....</b></p>
    </>),
    new GameTools.SetBackground(require('./components/grass.svg')),
    new GameTools.InfoBox("", "You hide in the bushes so you can text Dr. Wise and tell him about the situation. Meanwhile, you find this..."),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day2_notebookitems, GameTools.noteBookItem("Creature Card", () => new CreatureCard(`${getEquivalentCodeLetter('O')} ${getEquivalentCodeLetter('P')}`, require('./external/images/plumose.jpg'), "Plumose anemone", "Metridium giganteum", <p>
        Plumose anemones are sea anemones found mostly in the cooler waters of the northern Pacific and Atlantic oceans.
        They are characterized by their numerous threadlike tentacles extending from atop a smooth cylindrical column,
        and can vary from a few centimeters in height up to one meter or more.
        <br/>
        They reproduce by splitting themselves into two pieces, which then produces two new anemones.
    </p>)))),
    new GameTools.DialogueExperience(require('./external/wise.rive'), "Dr. Salman Wise, Ph.D", "", [
        "I assume you've read the news?",
        "We've traced that the whale population is being contaminated through salmon.",
        "Umm... yeah. Anyways, do you have any ideas?"
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hi.", GameTools.MessageSender.Player);
        await controller.sendMessage("This is Anna Atlantic's assistant, Ace.", GameTools.MessageSender.Player);
        await controller.sendMessage("Ahh... Ace. Sooo *pleased* to have you visit.");
        await controller.sendMessage("To what do I owe this great pleasure of mine?");
        toggleInputDisabled();
    }),
    GameTools.label("day2_mapimage"),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day2_notebookitems, GameTools.noteBookItem("Salmon map",
        () => new GameTools.InfoBox("Salmon map", <GameTools.ZoomableSVG style={{padding: "1em"}} src={require('./external/images/map.svg')} visibleLayers={[ "Basemap", "Layer 2"]}/>)))),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "What are salmon likely to be eating?", [
        { html: "Herring", correct: true},
        { html: "Clams" },
        { html: "Plankton" }
    ], true),
    new GameTools.DialogueExperience(null, "Dr. Salman Wise, Ph.D", "", [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("You should try to find the herring, since they are likely to be contaminating the salmon.");
        await controller.sendMessage("The best way to do that is to find plankton blooms, since those are what herring eat.");
        await controller.sendMessage("Plankton may seem tiny, but they're some of the most important organisms in the oceans.");
        await controller.sendMessage("While I collect data, try this quiz.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "The term 'plankton' is Greek for:", [
        { html: "wanderer", correct: true},
        { html: "tiny" },
        { html: "1 ton of wooden boards" }
    ], true),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Which of the following is considered plankton?", [
        { html: "herring" },
        { html: "jellyfish", correct: true },
        { html: "kelp" }
    ], true),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "What percentage of the world's oxygen is produced by phytoplankton?", [
        { html: "30-50%" },
        { html: "70-90%", correct: true },
        { html: "50-70%" }
    ], true),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Which of these is made of the remains of a plankton?", [
        { html: "sand" },
        { html: "chalk", correct: true },
        { html: "glue" }
    ], true),
    new GameTools.DialogueExperience(null, "Dr. Salman Wise, Ph.D", "", [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("It turns out that there are several large blooms of plankton around the areas where the salmon populations are.");
        await controller.sendMessage("I think PORPIS will be able to find herring at these locations. I'll send them my data and they should have results for you when you get back to your office");
        await controller.sendMessage("Good luck!");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.DialogueExperience(null, "Anna Atlantic", "", [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hey Ace, I just heard from PORPIS.\nI really like the ideas you're coming up with!\nGreat work!");
        await controller.sendMessage("I think we should look for the barrels around the area with the most contaminated whales.");
        await controller.sendMessage("(Have a look at your notebook if you're not sure what I mean.)");
        await controller.sendMessage("I'll give you the contact information for the experts over there. They should be able to help you out.");
        await controller.sendMessage("See you tomorrow!");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Loop({ index: "chapter_selection" }),
    // --------------------------- CHAPTER 3 ---------------------------
    GameTools.label("chapter3"),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    new GameTools.Invoke(() => notebookList = new Set()),
    new GameTools.AddToNotebook(() => notebookList, day1_notebookitems),
    new GameTools.AddToNotebook(() => notebookList, day2_notebookitems),
    day3Newspaper,
    new GameTools.DialogueExperience(require('./external/tasman.rive'), "Dr. MacDonald", null, [

    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hi! Your boss told me all about your search for these barrels.");
        await controller.sendMessage("I'm currently camping near the salmon population.");
        await controller.sendMessage("Before we get started, why don't you take a look at this tide graph?");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day3_notebookitems, GameTools.noteBookItem("Tide Graph", () => GameTools.help(new GameTools.ReactInfoBox(<div>
        <GameTools.ModalTitleBar showClose={true}/>
        {day3_question(false)}
        </div>), day3_help)))),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day3_notebookitems, GameTools.noteBookItem("Creature Card", () => new CreatureCard(`${getEquivalentCodeLetter('E')} ${getEquivalentCodeLetter('F')}`, require('./external/images/gga.jpg'), "Giant green anemone", "Anthopleura xanthogrammica", <p>
        Giant green anemones are sea anemones commonly found in the Pacific Ocean.
        <br/>
        Algae live in the anemone's tissues. The anemone's green color is caused by the algae as well as pigmentation.
    </p>)))),
    new GameTools.DialogueExperience(require('./external/tasman.rive'), "Dr. MacDonald", null, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Pretty interesting, huh?\nI decided I should come and test the water in the estuary near the suspected contamination.");
        await controller.sendMessage("The neat thing about estuaries is that they have a mix of freshwater from the rivers and saltwater in the ocean.");
        await controller.sendMessage("Why don't you analyze my results by taking a look at this quiz?");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "At 10:00 AM, was the water mostly freshwater or mostly saltwater?", [
        { html: "Freshwater", correct: true },
        { html: "Saltwater", }
    ], true, undefined, day3_question(true)),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Is the toxicity of the water higher when the salinity is higher?", [
        { html: "No" },
        { html: "Yes", correct: true }
    ], true, { showCorrectConfirmation: false }, day3_question(true)),
    new GameTools.DialogueExperience(require('./external/tasman.rive'), "Dr. MacDonald", null, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Right.\nIt looks like the contaminent is coming from the ocean and not the estuary.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Question(GameTools.QuestionType.MultipleChoice, "Dr. MacDonald: It's 7 AM now. What time will the next low tide be?", [
        { html: "3-4 hours", correct: true },
        { html: "6-7 hours" },
        { html: "11 hours"}
    ], true, { showCorrectConfirmation: false }, day3_question(true)),
    new GameTools.DialogueExperience(require('./external/tasman.rive'), "Dr. MacDonald", null, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Alright.\nI'm sending out a crew to test the mussels on the coastline.");
        await controller.sendMessage("Once I get the results, I'll text you.\n(There is free WiFi at the Pancake Mansion, so it's cheaper from there.)");
        await controller.sendMessage("Before you go, let me send you a copy of this.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.AddToNotebook(() => notebookList, GameTools.appendToArray(day3_notebookitems, GameTools.noteBookItem("Creature Card", () => new CreatureCard(`${getEquivalentCodeLetter('G')} ${getEquivalentCodeLetter('H')}`, require('./external/images/barnacle.jpg'), "Giant acorn barnacles", "Balanus nubilus", <p>
        A barnacle is a cirripede, a kind of crustacean. It is covered with hard plates of calcium carbonate, and lives stuck to hard surfaces.
        <br/>
        Barnacles are suspension feeders, sweeping small food into their mouth with their curved 'feet'.
        They are cemented to rock (usually), and covered with hard calcareous plates, which they shut firmly when the tide goes out.
    </p>)))),
    GameTools.label("chart_testing"),
    GameTools.invokeOn(new GameTools.ReactInfoBox(<GameTools.SpinningClock startHourAngle={30*8}/>, null), function() {
        this.once("display", async() => {
            await GameTools.sleep(4000);
            this.buttonCallback(null);
        });
    }),
    new GameTools.DialogueExperience(require('./external/tasman.rive'), "Dr. MacDonald", null, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Wow! It looks like the barrels are located right around where we first spotted the whale population.");
        await controller.sendMessage("The only problem is that we're going to need more help to pinpoint the exact location.");
        await controller.sendMessage("Your boss is flying here tomorrow.\nMaybe she knows somebody with that kind of equipment.");
        await controller.sendMessage("Anyways, sleep well! We're really close to the end now.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Loop({ index: "chapter_selection" }),
    // ------- Chapter 4 -----------
    GameTools.label("chapter4"),
    new GameTools.Invoke(() => notebookList = new Set()),
    new GameTools.AddToNotebook(() => notebookList, day1_notebookitems),
    new GameTools.AddToNotebook(() => notebookList, day2_notebookitems),
    new GameTools.AddToNotebook(() => notebookList, day3_notebookitems),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    day4Newspaper,
    new GameTools.DialogueExperience(null, "Anna Atlantic", null, [
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hey Ace!");
        await controller.sendMessage("It was a ridiculous flight to here.\nThe plane was vibrating like crazy inside!\nPlus, there were nonstop advertisements about Trivago.");
        await controller.sendMessage("I've run out of leads, so the only way to solve this case will be to find those barrels.");
        await controller.sendMessage("I booked you an early morning flight.\nI want you here quickly so that we can join Captain Atkins and her crew as soon as possible.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.SetBackground(require('./external/images/airport.jpg')),
    new GameTools.Delay(3000),
    new GameTools.SetBackground(require('./components/water.svg')),
    new GameTools.Delay(3000),
    new GameTools.DialogueExperience(require('./external/atkins.rive'), "Captain Atkins", null, [
        "Not particularly... the seats were really dirty! Also, the flight attendant was really rude."
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Welcome!");
        await controller.sendMessage("I hope you had a comfortable flight.");
        toggleInputDisabled();
    }),
    new GameTools.InfoBox("Let's look for the barrels!", "If you can't find the barrels, click the camera, and you will then be able to resurface and choose a different location."),
    GameTools.label("interactiveTest"),
    new GameTools.InteractiveSVGFinder("Where should we look for the barrels?", require('./external/images/barrel_map.svg'), [ ".barrel-pinpoint"], 3),
    new GameTools.Condition(new GameTools.Loop({ index: "find-barrels"}), GameTools.label(""), () => {
        return (GameTools.lastData as JQuery<Element>).get(0).getAttribute("id") == "real-barrels";
    }),
    new GameTools.HoleFinder([
        require('./external/images/seaweed.png'),
        require('./external/images/diver.svg'),
        require('./external/images/generic_fish.png'),
        require('./external/images/bottle.png')
    ], "water-hole-finder", false, "Resurface"),
    new GameTools.InfoBox("Captain Atkins", "Let's try looking for the barrels in a different location"),
    new GameTools.Loop({ index: "interactiveTest" }),
    GameTools.label("find-barrels"),
    new GameTools.HoleFinder([
        require('./external/images/barrels_end.png'),
        require('./external/images/seaweed.png'),
        require('./external/images/diver.svg'),
        require('./external/images/generic_fish.png'),
        require('./external/images/bottle.png')
    ], "water-hole-finder"),
    new GameTools.Loop({ index: "end-game" }),
    GameTools.label("end-game"),
    new GameTools.SetBackground(require('./external/images/airport.jpg')),
    new GameTools.Delay(3000),
    new GameTools.SetBackground(require('./external/images/office.svg')),
    new GameTools.ReactInfoBox(<GameTools.Newspaper paperName="Routine Rambler" articles={[
        {
            headline: "Source of Contaminent Located in Whale Case!",
            content: <>
                Captain Atkins announced today that thanks to the combined efforts of her crew, PORPIS,
                Anna Atlantic and her assistant, and other associated agencies, the source of the contaminant
                was located.
                <p></p>
                <blockquote>
                    We are pleased to announce that we have discovered why the whales were contaminated. Several
                    toxic barrels were dumped into the ocean by an unknown unscrupulous individual.
                </blockquote>
                Captain Atkins was unable to immediately confirm the person's identity, but assured
                <i> Routine Rambler</i> reporters that the person would be behind bars "within weeks".
                <p></p>
                Martin Mersenich was unable to be reached for comment. We have received numerous (unconfirmed) tips that he left
                the country today due to a sudden commitment elsewhere.
            </>
        }
    ]}/>),
    new GameTools.DialogueExperience(null, "Anna Atlantic", null, [], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("Hey Ace!\nGreat work on putting together all of these clues!\nRemember that code I sent you?\nI think you have enough Creature Cards to be able to figure it out!\nEven if you don't have all the letters, look for a pattern.\nThe entire code is based off one simple rule.\nStill confused? Remember that the cards show you how to hide your message.\nIf you want to find the message, you have to do something backwards.");
        GameTools.DialogueExperience.doReenableInput = true;
        controller.showCloseButton();
    }),
    new GameTools.Invoke(() => currentHint = 0),
    GameTools.label('solveCode'),
    new GameTools.Question(GameTools.QuestionType.FillInTheBlank, "What do you think the code is?", [ { html: realCode, correct: true }], false, undefined, `<p><b>${codedCode}</b></p>`),
    new GameTools.Invoke(async() => {
        const hints = [
            "<li><p>The letters on the card tell you how to encode the message. For example, if the card says 'A=K', the letter A would be replaced by the letter K when you are encoding it.</p>" +
            "<p>When decoding, it works the other way, i.e. the letter K become the letter A in the decoded message.</p></li>",
            "<li><p>Think of each letter as a number to figure out the code.</p></li>",
            "<li><p>There is a mathematical difference between the two letters.</p>" +
            "<p>For example, if the card says 'A=K', those two letters are ten spaces apart in the alphabet, so you could subtract 10 from the letter K's position to get the letter A.</p></li>",
            "<li><p>Remember, the code goes backwards.</p></li>"
        ];
        if(GameTools.lastResult)
            return;
        let hint: string;
        if(currentHint < hints.length) {
            hint = "<ul>";
            for(let i = 0; i <= currentHint; i++) { 
                hint += hints[i];
            }
            hint += "</ul>";
            currentHint++;
        } else {
            hint = "The answer is: <b>" + realCode + "</b>";
        }
        let box = new GameTools.InfoBox("Nope, here's a hint:", hint, "Try again", GameTools.InfoBox.defaultDelay, { customBodyClassList: "text-left"});
        await new Promise((resolve) => {
            box.once('undisplay', () => {
                GameTools.lastResult = false;
                resolve();
            });
            box.display();
        });
    }),
    new GameTools.Condition(GameTools.label(""), new GameTools.Loop({ index: "solveCode" })),
    new GameTools.DialogueExperience(require('./external/atlantic.rive'), "Anna Atlantic", null, [
        "Martin Mersenich is the one who dumped those barrels there!",
        "So, are we finished?"
    ], async(controller) => {
        toggleInputDisabled();
        await controller.sendMessage("So, did you solve it?");
        toggleInputDisabled();
    }),
    new GameTools.SetBackground(require('./components/fireworks.jpg')),
    new GameTools.Delay(3000),
    new GameTools.InfoBox("Congratulations!", "You've solved the mystery!"),
    new GameTools.Loop({ index: "chapter_selection"}),
];

(window as any).gt_imagePaths = Object.assign({}, require('./external/images/*.png'), require('./external/images/*.jpg'), require('./external/images/*.svg'));

console.log("init script about to run...");




function testDevTools() {

    var t = performance.now();

    for (var i = 0; i < 100; i++) {
        console.log(1);
        console.clear();
    }

    return performance.now() - t;
}

let initSpeed = testDevTools();
let inter;
function startCheck() {
    let cheated = () => {
        document.open();
        document.write('<h1>Are you trying to cheat?</h1><p><i>Those seeing this page may be cheaters.<br/>Don\'t be a cheater.</i></p><p>If you didn\'t mean to cheat, your device was probably running slowly and triggered the anti-cheat mechanism. Refresh the page and try again.</p><p>P.S. F12, Ctrl+U, and Ctrl+Shift+I are all ways to open Developer Tools - an easy way to cheat (except in this game).</p>');
        document.close();
        stopCheck();
        setTimeout(cheated, 2000);
    };
    stopCheck();

    console.dir(BrowserDetect);
    console.log("Browser: " + BrowserDetect.browser);
    if(process.env.NODE_ENV == 'production') {
        inter = setInterval(function() {
            var minimalUserResponseInMiliseconds = 500;
            var before = new Date().getTime();
            const dbg = new Function("debugger;");
            dbg();
            var after = new Date().getTime();
            if (after - before > minimalUserResponseInMiliseconds) { // user had to resume the script manually via opened dev tools 
                cheated();
            }
        }, 1000);
        (window as any).shortcut.add("F12", cheated);
        (window as any).shortcut.add("Ctrl+F12", cheated);
        (window as any).shortcut.add("Shift+F12", cheated);
        (window as any).shortcut.add("Ctrl+Alt+F12", cheated);
        (window as any).shortcut.add("Shift+Alt+F12", cheated);
        (window as any).shortcut.add("Ctrl+Shift+Alt+F12", cheated);
        (window as any).shortcut.add("Alt+F12", cheated);
        (window as any).shortcut.add("Ctrl+U", cheated);
        (window as any).shortcut.add("Ctrl+Shift+I", cheated);
    }
    
      
}

function stopCheck() {
    clearInterval(inter);
}

$(async function() {
    
    console.log(process.env.NODE_ENV);
    let badge = undefined;
    if(process.env.NODE_ENV == 'production') {
        await GameTools.sleep(3000-((window as any).load_endDate - (window as any).load_startDate));
    } else
        badge = <span>&nbsp;<span className="badge badge-secondary">development version</span></span>;
    GameTools.monkeyPatch();
    startCheck();
    GameTools.helpRef = React.createRef();
    ReactDOM.render(<>
        <span className="top-title">{document.title}{badge}</span>
        <div className="top-buttons">
            <GameTools.ControlButton onClick={showNotebook} name="Notebook" icon="fas fa-clipboard" colorClass="btn-success"/>
            <GameTools.ControlButton onClick={showFieldGuide} name="Field Guide" icon="fas fa-book" colorClass="btn-primary"/>
            <GameTools.HelpButton ref={GameTools.helpRef} name="Help" icon="fas fa-question" colorClass="btn-info"/>
        </div>
    </>, $("#top-bar").get(0));
    GameTools.initializeArray(myArray);
    GameTools.startDisplay(myArray);
});