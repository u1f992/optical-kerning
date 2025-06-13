ブラウザ環境のグローバルに依存しない体にするために`"lib": ["DOM"]`を外したい。`typescript/lib/lib.dom.d.ts`が型定義の実態だが、`*.d.ts`はグローバルに副作用がある。`*.ts`に変更すると`interface`は`export`されていないので利用できない。

```diff
--- node_modules/typescript/lib/lib.dom.d.ts	2025-06-13 12:27:33.212607815 +0900
+++ src/typescript/lib/lib.dom.ts	2025-06-13 16:25:48.205705332 +0900
@@ -14,7 +14,7 @@
 ***************************************************************************** */


-/// <reference no-default-lib="true"/>
+/* /// <reference no-default-lib="true"/> */

 /////////////////////////////
 /// Window APIs
@@ -4253,7 +4253,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CSSStyleDeclaration)
  */
-interface CSSStyleDeclaration {
+export interface CSSStyleDeclaration {
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/accent-color) */
     accentColor: string;
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/align-content) */
@@ -8226,7 +8226,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)
  */
-interface Element extends Node, ARIAMixin, Animatable, ChildNode, NonDocumentTypeChildNode, ParentNode, Slottable {
+export interface Element extends Node, ARIAMixin, Animatable, ChildNode, NonDocumentTypeChildNode, ParentNode, Slottable {
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) */
     readonly attributes: NamedNodeMap;
     /**
@@ -10439,7 +10439,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement)
  */
-interface HTMLCanvasElement extends HTMLElement {
+export interface HTMLCanvasElement extends HTMLElement {
     /**
      * Gets or sets the height of a canvas element on a document.
      *
@@ -10699,7 +10699,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement)
  */
-interface HTMLElement extends Element, ElementCSSInlineStyle, ElementContentEditable, GlobalEventHandlers, HTMLOrSVGElement {
+export interface HTMLElement extends Element, ElementCSSInlineStyle, ElementContentEditable, GlobalEventHandlers, HTMLOrSVGElement {
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) */
     accessKey: string;
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) */
@@ -15116,7 +15116,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ImageData)
  */
-interface ImageData {
+export interface ImageData {
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/ImageData/colorSpace) */
     readonly colorSpace: PredefinedColorSpace;
     /**
@@ -17018,7 +17018,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node)
  */
-interface Node extends EventTarget {
+export interface Node extends EventTarget {
     /**
      * Returns node's node document's document base URL.
      *
@@ -23125,7 +23125,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Text)
  */
-interface Text extends CharacterData, Slottable {
+export interface Text extends CharacterData, Slottable {
     /**
      * Returns the combined data of all direct Text node siblings.
      *
@@ -26910,7 +26910,7 @@
  *
  * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window)
  */
-interface Window extends EventTarget, AnimationFrameProvider, GlobalEventHandlers, WindowEventHandlers, WindowLocalStorage, WindowOrWorkerGlobalScope, WindowSessionStorage {
+export interface Window extends EventTarget, AnimationFrameProvider, GlobalEventHandlers, WindowEventHandlers, WindowLocalStorage, WindowOrWorkerGlobalScope, WindowSessionStorage {
     /**
      * @deprecated This is a legacy alias of `navigator`.
      *
@@ -27294,8 +27294,10 @@
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/reportError) */
     reportError(e: any): void;
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/setInterval) */
+    // @ts-ignore
     setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/setTimeout) */
+    // @ts-ignore
     setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
     /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/structuredClone) */
     structuredClone<T = any>(value: T, options?: StructuredSerializeOptions): T;
```
