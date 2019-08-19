/// <reference path="gametools.d.ts" />

import "core-js/stable";
import "regenerator-runtime/runtime";

import './external/import-jquery';

import './styles.scss'; 
import './external/jquery.svg.min';
import './external/jquery.svg.css';

import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';

import './external/jquery.ui.touch-punch.min.js';

import 'popper.js';
import 'bootstrap';



import React, { Suspense, lazy } from 'react';

import * as ReactDOM from 'react-dom';

import * as ReactDOMServer from 'react-dom/server';


import { RoutedTabs, NavTab } from "react-router-tabs";

import { MemoryRouter as Router, Route, Link } from "react-router-dom";

import { default as Moment, MomentProps } from 'react-moment';

import moment from 'moment';

import paula_pacific from './external/paula_pacific.png';

import RiveScript from './node_modules/rivescript/lib/rivescript.js';


/* import { Widget, dropMessages, addResponseMessage, toggleInputDisabled, toggleMsgLoader } from './components/chat/index.js'; */

import '@fortawesome/fontawesome-free/css/all.css';

import 'intersection-observer';

import domtoimage from 'dom-to-image-more';

import BrowserDetect from './components/browserdetect.js';

import 'jquery-touch-events';

import pluralize from 'pluralize';

import ScrollBooster from 'scrollbooster';

require('velocity-animate');


namespace GameTools {
    export let helpRef: React.RefObject<any>;
    let helpShown: boolean;
    let reactedSet: Set<HTMLElement>;
    let visibleStack: DisplayedItem[];
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
    type GameArrayItem = DisplayedItem|GameArrayFunctionItem;
    export interface GameArray extends Array<GameArrayItem> {
        contentsIndex?: number;
        indexPollers?: Array<() => void>;
        initialized?: boolean;
    }
    export function initializeArray(array: GameArray, clearPollers = false) {
        array.contentsIndex = 0;
        
        if(!array.initialized || clearPollers)
            array.indexPollers = new Array();
        array.initialized = true;
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
    async function toDisplayedItem(item: GameArrayItem, array?: GameArray) {
        if(isDisplayedItem(item))
            return (item as DisplayedItem);
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
        public isDisplaying(): boolean {
            return this._isDisplaying;
        }
        static getCurrentlyVisible(): DisplayedItem {
            return visibleStack[visibleStack.length - 1];
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
        public getHelp(): string {
            return this.objectHelp() + this.contextualHelp();
        }
        protected objectHelp(): string {
            return "";
        }
        constructor() {
            this._isDisplaying = false;
            this.wrapper = null;
            this.parentArray = null;
            this.arraySet = false;
            this.autoWakePollers = true;
        }
        public setParentArray(array: GameArray): this {
            if(array == null) {
                array = [ this ];
                initializeArray(array);
            }
            if(!this.arraySet) {
                this.parentArray = array;
                this.arraySet = true;
            }
            return this;
        }
        public getParentArray(): GameArray {
            if(this.parentArray == null) {
                this.setParentArray([ this ]);
                initializeArray(this.parentArray);
            }
            return this.parentArray;
            
        }
        async resize() {

        }
        myIndex(): number {
            let array =  this.getParentArray();
            if(this.wrapper != null)
                return array.indexOf(this.wrapper);
            else
                return array.indexOf(this);
        }
        async display() {
            this._isDisplaying = true;
            visibleStack.push(this);
            DisplayedItem.updateHelp();
        }
        async undisplay() {
            this._isDisplaying = false;
            visibleStack.splice(visibleStack.indexOf(this), 1);
            DisplayedItem.updateHelp();
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
        getNextItem(): GameArrayItem {
            if(this.myIndex() == -1)
                return null;
            if(this.getParentArray().contentsIndex == this.getParentArray().length - 1) {
                this.logWarning("No next items");
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
        public async displayNext() {
            setTimeout(async () => {
                await this.undisplay();
                if(this._isDisplaying)
                    throw new Error("This item did not call super.undisplay()!");
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
            }, 0);
        }
        async reset() {

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
    function doRenderReact<T extends React.Component>(element: JSX.Element, container: HTMLElement, callback?: (component: T) => any) {
        ReactDOM.render(element, container, function() {
            if(callback != undefined && callback != null)
                callback(this);
        });
        reactedSet.add(container);
    }
    export function getValue<T>(val: GameValue<T>, container?: HTMLElement): T {
        let value: T;
        if(val == null || val == undefined) {
            value = null;
        } else if(Object(val) !== val) {
            value = ((val as unknown) as T);
        } else if(val instanceof Function) {
            value = val();
        } else if(React.isValidElement(val)) {
            if(container !== undefined) {
                doRenderReact(val, container);
                return undefined;
            } else {
                value = ((ReactDOMServer.renderToString(val) as unknown) as T);
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
    export class InfoBox extends DisplayedItem {
        public static readonly defaultDelay = 1000;
        public $dialog: JQuery<HTMLElement>;
        public $title: JQuery<HTMLElement>;
        public $content: JQuery<HTMLElement>;
        public $footer: JQuery<HTMLElement>;
        constructor(protected title: GameValue<string>, protected text: GameValue<string>, protected buttonText: GameValue<string> = "OK", protected delay?: number, protected style?: StylisticOptions) {
            super();
            this.style = StylisticOptions_Init(this.style);
            this.$dialog = null;
            this.$content = null;
            this.$footer = null;
            this.$title = null;
            this.autoWakePollers = false;
        }
        protected async dialogCreated() {

        }
        public buttonCallback(e: JQuery.ClickEvent): void {
            this.displayNext();
        }
        async undisplay() {
            await super.undisplay();
            this.$dialog.modal('hide');
            await new Promise((resolve) => {
                this.$dialog.one("hidden.bs.modal", () => resolve());
            });
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
                $("#gametools-container").append(this.$dialog);
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
                modal_content.addClass(this.style.customBackgroundClassList);
                let modal_header = $("<div></div>").addClass("modal-header");
                modal_content.append(modal_header);
                this.$title = $("<h5></h5>").addClass("modal-title");
                modal_header.append(this.$title);
                let close_button = $("<button></button>").addClass("close").attr({ "aria-label": "Close"});
                modal_header.append(close_button);
                close_button.append($("<span></span>").attr("aria-hidden", "true").html("&times;"));
                this.$content = $("<div></div>").addClass("modal-body").addClass(this.style.customBodyClassList);
                modal_content.append(this.$content);
                this.$footer = $("<div></div>").addClass("modal-footer");
                modal_content.append(this.$footer);
                this.$footer.append($("<button></button>").addClass("btn btn-primary").attr("type", "button").text("OK"));

                if(this.title != null) {
                    this.$dialog.find(".modal-header").show();
                    getValue(this.title, this.$title.get(0));
                } else {
                    this.$dialog.find(".modal-header").hide();
                }
                    
                if(this.text != null) {
                    this.$dialog.find(".modal-body").show();
                    if(!this.style.useAsContainer) {
                        getValue(this.text, this.$dialog.find(".modal-body").get(0));
                    } else {
                        let header = modal_header.get(0);
                        let footer = this.$footer.get(0);
                        modal_content.empty();
                        getValue(this.text, modal_content.get(0));
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
                
                let realText = getValue(this.buttonText);
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
                if(this.style.forceShowClose) {
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
                    if(this.style.showBackdrop) {
                        let $backdrop = $("<div></div>").addClass("modal-backdrop fade show");
                        $backdrop.css("z-index", zIndex - 5);
                        $("#gametools-container").append($backdrop);
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
                });
                this.$dialog.modal( { backdrop: false });
            });
        }
    }
    export class ReactInfoBox extends InfoBox {
        protected component: React.Component;
        constructor(protected jsxElement: JSX.Element, buttonText = "OK", delay = InfoBox.defaultDelay, style?: StylisticOptions) {
            super(null, "", buttonText, delay, style);
            this.component = null;
        }
        async reset() {
            this.component = null;
            await super.reset();
        }
        async undisplay() {
            await super.undisplay();
            this.component = null;
        }
        async dialogCreated() {
            this.$dialog.find(".modal-dialog").empty();
            await new Promise((resolve) => {
                doRenderReact(this.jsxElement, this.$dialog.find(".modal-dialog").get(0), () => {
                    let $container = this.$dialog.find(".modal-dialog").children();
                    $container.addClass("modal-content");
                    resolve();
                });
            });
            
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
                getValue(element, $button.get(0));
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
            var audio = new Audio(getValue(audioFile));
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
            this.gt_label = getValue(name);
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
                if(label.gt_label == getValue(indexVal)) {
                    theLabel = index;
                    return true;
                }
                return false;
            });
            return theLabel;
        }
        public static lookupItem(array: GameArray, indexVal: GameValue<string>): number {
            let val = getValue(indexVal);
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
                var indexVal = getValue(this.loopInfo.index);
                if(typeof indexVal == "number") {
                    if(this.loopInfo.relative && this.myIndex() == -1)
                        throw "Not in gameContents array, cannot use relative branch";
                    if(!this.loopInfo.relative)
                        this.getParentArray().contentsIndex = indexVal;
                    else
                    this.getParentArray().contentsIndex += indexVal;
                } else {
                    let theItem: number = Label.lookupItem(this.getParentArray(), indexVal);
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
        array.forEach((item) => {
            if(isDisplayedItem(item)) {
                item.setParentArray(array);
            }
        });
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
        constructor(protected title: GameValue<string>, protected items: DragTargetsQuestionItem[], protected shuffleTargets = false, protected shuffleOptions = false, protected allowMultiple = false) {
            super(title, "", "Check");
        }
        buttonCallback(e: JQuery.ClickEvent): void {
            var $itemsDiv = this.$dialog.find(".modal-body .items-div");
            var $targetsDiv =  this.$dialog.find(".modal-body .targets-div");
            if(!DragTargetsQuestion.alwaysBeRight && $itemsDiv.children().length > 0) {
                GameTools.lastResult = false;
            } else {
                var $dragItems = $targetsDiv.find(".drag-item");
                GameTools.lastResult = true;
                if(!DragTargetsQuestion.alwaysBeRight)
                    $dragItems.each((index, element): false | void => {
                        if(!($(element).data("target") as JQuery<HTMLElement>).is($(element).parent())) {
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
            this.items.forEach(item => {
                const target = item.target;
                let $targetDiv = null;
                if(target != null && target != undefined) {
                    let $span = $("<span></span>");
                    getValue(target, $span.get(0));
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
    
    
                    $targetDiv = $div;
                    
                    
                    $targetDiv.attr("title", $targetDiv.data("my-text"));
                    $targetDiv.tooltip({
                        html: true
                    });
                    $targetDiv.tooltip('disable');
                }
                const backColor = HSLToHex(getRandomInt(0, 360), 100, 90);
                let $div = $("<div></div>").addClass("drag-item").data("target", $targetDiv).css({
                    "background-color": backColor,
                    "color": getContrastYIQ(backColor)
                });
                let $tmpDiv = $("<div></div>").css("margin", "auto");
                getValue(item.name, $tmpDiv.get(0));
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
            if(getValue(this.customCondition))
                this.trueStatement.display();
            else
                this.falseStatement.display();
        }
        async reset() {
            await super.reset();
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
                this.$svgContainer.load(getValue(this.imgSrc), () => {
                    this.svgElement = (this.$svgContainer.find("svg").get(0) as Element as SVGElement);
                    let loadCallback = () => {
                        if(this.interactiveComponents)
                            this.interactiveComponents.forEach((selector, index) => {
                                var svg = this.svgElement;
        
                                let elements = svg.querySelectorAll(getValue(selector));
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
        async undisplay() {
            await super.undisplay();
            $(window).off("resize", InteractiveSVG.scrollHandler);
        }
    }
    export class Finder {
        public itemsFound: number;
        private itemIndexes: any[] = [];
        public static readonly defaultKeyword = "found";
        public $componentFound: JQuery;
        constructor(public parent: InfoBox, public numItems: number, public keyword = Finder.defaultKeyword) {
            this.reset();
        }
        reset(): void {
            this.itemIndexes = [];
            this.itemsFound = 0;
        }
        setTitle(): void {
            if(this.itemsFound > 0)
                this.parent.$dialog.find(".modal-title").text("You have " + this.keyword + " " + this.itemsFound + " of " + this.numItems + " items.");
        }
        itemFound($component: JQuery<any>): void {
            
            if(this.itemIndexes.indexOf($component.data("index")) == -1) {
                this.itemsFound++;
                this.itemIndexes.push($component.data("index"));
            }
            this.$componentFound = $component;
            this.parent.displayNext();
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
            this.finder.itemFound($component);
        }
        async reset() {
            if(this.finder != null)
                this.finder.reset();
            await super.reset();
        }
    }
    export class ButtonFinder extends InfoBox {
        finder: Finder;
        didDisplay = false;
        foundIndexes: number[];
        constructor(title: GameValue<string>, public instructions: GameValue<string>, public buttons: (GameValue<string>)[], public delay = InfoBox.defaultDelay) {
            super(title, instructions, null, delay);
            this.finder = new Finder(this, buttons.length, "explored");
            this.foundIndexes = [];
        }
        async reset() {
            if(this.finder != null)
                this.finder.reset();
            await super.reset();
            this.foundIndexes = [];
            this.didDisplay = false;
        }
        async displayNext() {
            if(this.didDisplay)
                GameTools.lastResult = false;
            else
                GameTools.lastResult = this.finder.finished();
            console.log(this.finder.$componentFound.get(0));
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
                getValue(this.instructions, $span.get(0));
                $body.append($span);
            }
                
            this.finder.setTitle();
            var $finderButtons = $("<div></div>").addClass("finder-buttons").appendTo($body);
            this.buttons.forEach((element, index) => {
                var $button = $("<button></button>");
                getValue(element, $button.get(0));
                if(this.foundIndexes.indexOf(index) != -1) {
                    $button.addClass("was_found");
                }
                $button.data("index", index);
                $button.data("element", element);
                $button.click((e) => {
                    $finderButtons.children("button").prop("disabled", true);
                    this.foundIndexes.push($(e.target).data("index"));
                    this.finder.itemFound($(e.target));
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
    }
    function StylisticOptions_Init(opts: StylisticOptions): StylisticOptions {
        if(opts === undefined)
            opts = {};
        if(opts.shouldColorBackgrounds === undefined)
            opts.shouldColorBackgrounds = true;
        if(opts.shouldShuffle === undefined)
            opts.shouldShuffle = true;
        if(opts.showBackdrop === undefined)
            opts.showBackdrop = true;
        if(opts.forceShowClose === undefined)
            opts.forceShowClose = false;
        if(opts.customBackgroundClassList === undefined)
            opts.customBackgroundClassList = ""; 
        if(opts.customBodyClassList === undefined)
            opts.customBodyClassList = "";
        if(opts.useAsContainer === undefined)
            opts.useAsContainer = false;
        return opts;
    }
    function colorBackground($element) {
        const backColor = HSLToHex(getRandomInt(0, 360), 100, 90);
        $element.css({
            "background-color": backColor,
            "color": getContrastYIQ(backColor)
        });
    }
    export class MultipleChoiceQuestion extends InfoBox {
        readonly isQuestion: boolean;
        constructor(question: GameValue<string>, protected choices: QuestionOption[], protected shouldReDisplay = false, style?: StylisticOptions) {
            super(question, "", null, InfoBox.defaultDelay, style);
            this.isQuestion = choices.some((choice: QuestionOption) => {
                return choice.correct;
            });
        }
        async answered($button: JQuery<HTMLElement>) {
            let option: QuestionOption = $button.data("questionOption");
            if(option.fn !== undefined)
                await option.fn.call(option);
            GameTools.lastData = this.choices.indexOf(option);
            if(!this.isQuestion || option.correct) {
                GameTools.lastResult = true;
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
        async dialogCreated() {
            var $body = this.$dialog.find(".modal-body");
            var $finderButtons = $("<div></div>").addClass("finder-buttons").appendTo($body);
            shuffle(this.choices, this.style.shouldShuffle).forEach((element, index) => {
                var $button = $("<button></button>");
                getValue(element.html, $button.get(0));
                if(this.style.shouldColorBackgrounds)
                    colorBackground($button);
                $button.data("index", index);
                $button.data("questionOption", element);
                $button.click(async (e) => {
                    $finderButtons.children("button").prop("disabled", true);
                    await this.answered($button);
                });
                $finderButtons.append($button);
            });
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
        reactedSet = new Set<HTMLElement>();
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
        var observer = new MutationObserver(function(mutations) {
            // check for removed target
            mutations.forEach(function(mutation) {
                var nodes = Array.from(mutation.removedNodes);
                nodes.forEach(element => {
                    if(isElement(element)) {
                        let html = (element as HTMLElement);
                        
                        reactedSet.forEach((element) => {
                            if($(html).is($(element)) || $.contains(html, element)) {
                                ReactDOM.unmountComponentAtNode(element);
                                reactedSet.delete(element);
                            }
                        });
                    }
                    
                });

            });
        });

        var config = {
            subtree: true,
            childList: true
        };
        observer.observe(document.body, config);
        BrowserDetect.init();
        $(window).resize(handleResize);
    }
    async function handleResize() {
        for(let i = 0; i < visibleStack.length; i++) {
            await visibleStack[i].resize();
        }
    }
    export function warnUser(): void {
        if(BrowserDetect.browser === 'Explorer') {
            new InfoBox("Attention!", "<p>This game is not heavily tested on Internet Explorer and may contain bugs/visual issues.</p>" +
                "<p>Please use a browser such as Pale Moon, Mozilla Firefox, or Google Chrome.</p>", "Continue anyways", 0).display();
        }
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
            let conditionVal: T = getValue(this.value);
            let defaultCase: DefaultSwitchCase<T> = null;
            let wasHandled = this.cases.some((val: (SwitchCase<T>)) => {
                if((val as DefaultSwitchCase<T>).default === undefined && Switch.valueMatches<T>(val.caseValue, conditionVal)) {
                    (val as BaseSwitchCase<T>).handler(conditionVal);
                    return true;
                } else if((val as DefaultSwitchCase<T>).default === true) {
                    if(defaultCase != null)
                        throw "Multiple default cases";
                    else
                        defaultCase = (val as DefaultSwitchCase<T>);
                }
                return false;
            });
            if(!wasHandled && defaultCase != null) {
                defaultCase.handler(conditionVal);
            }
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
    export function label<T extends GameArrayItem>(label: GameValue<string>, item?: T): LabelledItem&T;
    export function label<T extends GameArrayItem>(label: GameValue<string> = "", item?: T): LabelledItem&T {
        if(item !== undefined) {
            let li = (item as unknown as LabelledItem);
            li.gt_label = getValue(label);
            return li as LabelledItem&T;
        } else {
            return new Label(label) as LabelledItem&T;
        }
        
    }
    export function help<T extends GameArrayItem>(item: T, help: GameValue<string>): ContextualHelpItem&T {
        let hi = (item as unknown as ContextualHelpItem);
        hi.gt_help = getValue(help);
        return hi as ContextualHelpItem&T;
    }
    export async function startDisplay(array: GameArray) {
        await GameTools.resetSystem(array);
        await GameTools.restart(array);
    }
    export function scope<T extends DisplayedItem>(array: GameValue<GameArray>, item: T): T {
        item.parentArray = getValue(array);
        return item;
    }
    export interface ListComponentProps{
        array: any[];
        listType: "ul" | "ol";
        itemClassName?: string;
        onClick?: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
    }
    type NotebookItem = String&{
        noteBookLink?: GameArrayItem;
    };
    export function noteBookItem(itemName: String, noteBookLink?: GameArrayItem): NotebookItem {
        let item: NotebookItem = (new String(itemName) as NotebookItem);
        item.noteBookLink = noteBookLink;
        return item;
    }
    export class Notebook extends React.Component<{ title: string; notebookItems: NotebookItem[]; }> {
        async itemOnClick(e: React.MouseEvent<HTMLLIElement, MouseEvent>) {
            let index = parseInt($(e.target).attr("data-index"));
            if(this.props.notebookItems[index].noteBookLink != undefined) {
                let item = await toDisplayedItem(this.props.notebookItems[index].noteBookLink, null);
                await item.display();
            }
        }
        render() {
            const { title, notebookItems, ...rest } = this.props;
            return <div className="gametools-notebook" {...rest}>
                <div className="lines"></div>
                <ModalTitleBar title={this.props.title}/>
                <ul>
                    {notebookItems.map((item, index) => <li className={item.noteBookLink !== undefined ? "gt-notebook-clickable": ""} data-index={index} key={index} onClick={this.itemOnClick.bind(this)}>{item}</li>)}
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
            $(this.buttonRef.current).tooltip();
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
                if(slugify(getValue(pageItem.name)) == slug) {
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
            return { __html: getValue(this.getPageFromSlug(routeProps.match.params.id).info)};
        }
        componentDidMount() {
            let body = $(this.navRef.current).parent();
            body.addClass("gt-infopage");
            body.parent().addClass("gt-infopage-modal-content");
        }
        render() {
            let pageLinks: JSX.Element[] = [];
            this.props.pages.forEach((page) => {
                let value = getValue(page.name);
                pageLinks.push(<NavTab className="nav-link" activeClassName="active" to={"/" + slugify(value)}>{value}</NavTab>);
            });
            this.navRef = React.createRef();
            return <Router>
                <nav ref={this.navRef} className="gt-infopage-navbar navbar navbar-expand-sm w-100">
                    <ListComponent array={pageLinks} listType="ul" className="navbar-nav nav-fill w-100 nav-tabs d-flex flex-row justify-content-center align-items-center align-content-center" itemClassName="nav-item" />
                </nav>
                <div className="info-page-info">
                    <Route path="/:id" render={routeProps => <span dangerouslySetInnerHTML={this.getPageInfo(routeProps)}></span>}/>
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
        return <>{getValue(props.val)}</>;
    }
    export function Newspaper(props: { paperName: GameValue<string>; subhead?: GameValue<string>; articles: NewspaperArticle[] }) {
        return <div className="newspaper">
            <div className="head modal-header">
                <div className="newspaper-headline"><ReactGameValue val={props.paperName}/></div>
                <ModalCloseButton/>
            </div>
            <div className="subhead">
            <ReactGameValue val={props.subhead}/>
            </div>
            <div className="content">
                <div className="columns">
                {props.articles.map((article, index) => <div key={index} className="column">
                    <div className="head">
                        <span className="headline hl3"><ReactGameValue val={article.headline}/></span>
                        <p>
                        <span className="headline hl4"><ReactGameValue val={article.subhead}/></span>
                        </p>
                    </div>
                    <p>
                        {article.content}
                    </p>
                </div>)}
                </div>
            </div>
        </div>;
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
            const Widget = React.lazy(() => import('./components/chat/Widget.js'));
            return <Suspense fallback={<div>Loading...</div>}>
               <Widget showCloseButton={this.state.showCloseButton} {...rest}/>
            </Suspense>;
        }
    }
    export class DialogueExperience extends ReactInfoBox {
        protected currentStatement;
        protected lastSeenTime: Date;
        protected momentRef: React.RefObject<MomentWrapper>;
        protected mustAskAll: boolean;
        protected asked: Set<string>;
        protected allMessages: string[];
        protected widgetRef: React.RefObject<DialogueWidgetWrapper>;
        public static readonly builtinMessages = [
            "Hi!",
            "What's your name?"
        ];
        protected bot: RiveScript;
        async endDialogue() {
            await sleep(2000);
            this.displayNext();
        }
        async handleNewUserMessage(newMessage) {
            const { toggleInputDisabled, toggleMsgLoader, addResponseMessage } = await import('./components/chat/index.js');
            toggleInputDisabled();
            await sleep(1000);
            console.log("Message converted to: " + newMessage);
            this.lastSeenTime = new Date();
            this.momentRef.current.setState({ date: this.lastSeenTime});
            let reply = await this.bot.reply("local-user", newMessage, this);
            // Now send the message throught the backend API
            await new Promise(async(resolve) => {
                let replies = reply.split('\n');
                for(let index = 0; index < replies.length; index++) {
                    toggleMsgLoader();
                    await sleep(1000);
                    toggleMsgLoader();
                    addResponseMessage(replies[index]);
                    await sleep(500);
                }
                resolve();
            });
            this.asked.add(newMessage);
            let requiredQuestions = this.allowedMessages;
            let notDone = requiredQuestions.some((msg) => {
                console.log("Have we asked " + msg);
                return !this.asked.has(msg);
            });
            if(!notDone) {
                this.widgetRef.current.setState({ showCloseButton: true });
            }
            toggleInputDisabled();
        }
        constructor(protected riveFile: string, avatar?: string, protected allowedMessages?: string[]) {
            super(null);
            this.lastSeenTime = new Date();
            this.mustAskAll = allowedMessages != undefined;
            const dateFilter = (d) => {
                return "Active " + d;
            };
            this.momentRef = React.createRef<MomentWrapper>();
            this.widgetRef = React.createRef<DialogueWidgetWrapper>();
            this.allMessages = DialogueExperience.builtinMessages.concat(allowedMessages);
            this.jsxElement = <DialogueWidgetWrapper ref={this.widgetRef} fullScreenMode={false}
                                      showCloseButton={allowedMessages == undefined}
                                      title="Paula Pacific"
                                      titleAvatar={avatar}
                                      profileAvatar={avatar}
                                      onCloseClick={this.displayNext.bind(this)}
                                      subtitle={<MomentWrapper ref={this.momentRef} filter={dateFilter} fromNow date={this.lastSeenTime}/>}
                                      possibleMessages={this.allMessages}
                                      inputType={allowedMessages == undefined ? "text" : "dropdown"}
                                      handleNewUserMessage={this.handleNewUserMessage.bind(this)}/>;
        }
        async dialogCreated() {
            await super.dialogCreated();
            this.lastSeenTime = new Date();
            
        }
        async reset() {
            const { dropMessages } = await import('./components/chat/index.js');
            dropMessages();
            this.currentStatement = 0;
            this.asked = new Set<string>();
            this.lastSeenTime = new Date();
            this.bot = new RiveScript({
                concat: "newline"
            });
            if(this.riveFile == null || this.riveFile == undefined)
                throw new Error("Undefined riveFile");
            
            await this.bot.loadFile([
                this.riveFile,
                require('./components/chat/builtin.rive')
            ]);
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
                    setTimeout(() => {
                        new InfoBox("Information", topItem.getHelp(), "OK", 0).display();
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
        constructor(protected randomImages: string[], protected customClasses = "") {
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
            this.modal_content.find("img.velocity_animating").velocity("stop", true as unknown);
        }
        async undisplay() {
            this.shouldContinue = false;
            this.stopAnimation();
            await super.undisplay();
        }
        async animateNextImage() {
            await sleep(2000);
            let $image = $("<img></img>").attr("src", this.randomImages[this.imageIndex]).attr("data-index", this.imageIndex);
            $image.css("z-index", getRandomInt(1, 15));
            this.images.append($image);
            let dimension = this.holeFinder.outerWidth();
            let invert = getRandomInt(0, 1) == 1 ? 1 : -1;
            $.Velocity.hook($image, "scaleX", invert.toString());
            $.Velocity.hook($image, "translateX", (-dimension) + "px");
            $image.show();
            this.isAnimating = true;
            this.currentImage = $image.get(0) as HTMLImageElement;
            this.observer.observe(this.currentImage);
            $image.velocity({ 
                translateX: (dimension) + "px"
            }, { 
                duration: 1000,
                delay: 0,
                easing: "linear",
                complete: () => {
                    this.isAnimating = false;
                    if(this.currentImage != null)
                        this.observer.unobserve(this.currentImage);
                    this.currentImage = null;
                    this.currentRatio = 0;
                    $image.remove();
                    if(this.shouldContinue)
                        this.animateNextImage();
                }
            });
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
                "align-items": "center"
            });
            let holeFinderContainer;
            this.modal_content.append(holeFinderContainer = $("<div></div>").addClass("hole-finder-container"));
            holeFinderContainer.append(this.holeFinder = $("<div></div>"));
            this.holeFinder.addClass("hole-finder " + this.customClasses);
            for(var i = 0; i < 50; i++) {
                this.holeFinder.append($("<span class='bubble'></span>"));
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
                    throw new Error("Not expecting multiple entries (" + entries.length + ")");
                this.currentRatio = entries[0].intersectionRatio;
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
                if(this.currentRatio >= 0.5) {
                    let index = parseInt(this.currentImage.getAttribute("data-index"));
                    if(index == 0) {
                        foundItem = true;
                    } else
                        errorMessage = "That isn't what we're looking for. Try again.";
                } else
                    errorMessage = "It doesn't look like there was much to see there. Try again.";
                if(foundItem) {
                    this.displayNext();
                    return;
                }

                domtoimage.toPng(this.holeFinder.get(0), {
                    style: {
                        boxShadow: "none"
                    }
                }).then(async(dataUrl) => {
                    dataUrl = await HoleFinder.cropImageURL(dataUrl);
                    await new InfoBox("Hmm...", "<img class='gt-preview-image' src='" + dataUrl + "'/><hr/>" + errorMessage, "OK", 0).display();
                    this.allowClicks = true;
                }, async(reason) => {
                    console.error(reason);
                    await new InfoBox("Hmm...", errorMessage, "OK", 0).display();
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
}

class CreatureCard extends GameTools.InfoBox {
    constructor(protected code: string, protected img: string, protected name: string, protected taxonomy: string, protected info: string) {
        super("", "", "OK");
    }
    async dialogCreated() {
        this.$content.parent().addClass("creature-card");
        let modal_header = this.$title.parent();
        modal_header.empty();
        modal_header.html(this.code);
        let leftDiv = $("<div><h2>CREATURE CARDS</h2><h4>PACIFIC NORTHWEST SERIES</h4><img src='" + this.img + "'/></div>");
        this.$content.empty();
        this.$content.append(leftDiv);
        let rightDiv = $("<div></div>");
        rightDiv.append("<h4>" + this.name + "</h4><h5>" + this.taxonomy + "</h5>");
        rightDiv.append($("<span></span>").html(this.info));
        this.$content.append(rightDiv);
    }
}
async function showNotebook(this: GameTools.ControlButton) {
    await new Promise((resolve) => {
        GameTools.startDisplay([ 
            new GameTools.ReactInfoBox(<GameTools.Notebook title="My Notebook" notebookItems={notebookList}/>, null, 0),
            new GameTools.Invoke(resolve)
        ]);
    });
    
}

let infoGuide: GameTools.InfoPageItem[] = [
    { name: "Test page 1", info: "<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1<p></p>Info 1"},
    { name: "Test page 2", info: "Info 2"},
    { name: "Test page 3", info: "Info 3"},
    { name: "Test page 4", info: "Info 4"},
    { name: "Test page 5", info: "Info 5"},
    { name: "Test page 6", info: "Info 6"}
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
import { connect } from "tls";
let myArray = [
    new GameTools.Invoke(() => $(".se-pre-con").addClass("hide")),
    new GameTools.Loop({ index: "breakingNews"}),
    new GameTools.MultipleChoiceQuestion("Choose a chapter.", [
        { html: "Chapter 1" },
        { html: "Chapter 2" },
        { html: "Chapter 3" },
        { html: "Chapter 4" }
    ], false, { shouldColorBackgrounds: false, shouldShuffle: false }),
    new GameTools.Loop({ index: () => "chapter" + (GameTools.lastData + 1)}),
    GameTools.label("chapter1", new GameTools.InfoBox("Welcome to Day 1!", <>
        <p>Let's get started.</p>
        <hr/>
        <p>Today we'll be doing bla bla bla. bla bla bla.</p>
        <hr/>
        <p>Today we'll be doing bla bla bla. bla bla bla.</p>
        <hr/>
        <p>Today we'll be doing bla bla bla. bla bla bla.</p>
        <hr/>
        <p>Today we'll be doing bla bla bla. bla bla bla.</p>
    </>, "OK", GameTools.InfoBox.defaultDelay, { customBackgroundClassList: "paper-background"})),
    GameTools.label("breakingNews", new GameTools.DragTargetsQuestion("", [
        { name: "Herring", target: "What eats Plankton?" },
        { name: "Plankton" }
    ])),
    new GameTools.Loop({ index: "breakingNews"})
];
let notebookList = [
    GameTools.noteBookItem("Item 1", myArray[GameTools.Label.lookupItem(myArray, "breakingNews")]),
    "item 2",
    "Item 3"
];


$(window).on("load", async function() {
    GameTools.monkeyPatch();
    GameTools.helpRef = React.createRef();
    ReactDOM.render(<>
        <span className="top-title">Title</span>
        <div className="top-buttons">
            <GameTools.ControlButton onClick={showNotebook} name="Notebook" icon="fas fa-clipboard" colorClass="btn-success"/>
            <GameTools.ControlButton onClick={showFieldGuide} name="Field Guide" icon="fas fa-book" colorClass="btn-primary"/>
            <GameTools.HelpButton ref={GameTools.helpRef} name="Help" icon="fas fa-question" colorClass="btn-info"/>
        </div>
    </>, $("#top-bar").get(0));
    GameTools.initializeArray(myArray);
    GameTools.waitForIndex(myArray, GameTools.Label.lookupItem(myArray, "breakingNews")).then(() => {
        GameTools.warnUser();
    });
    GameTools.startDisplay(myArray);
});
