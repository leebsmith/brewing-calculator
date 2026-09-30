Modern accordion UIs succeed by balancing information density with clear spatial context, revealing complex content only when the user explicitly requests it.

A well-designed accordion relies on several foundational principles across both visual design and interaction behavior:

* **Clear Affordances:** Chevrons (`˅` / `˄`) or plus/minus (`+` / `-`) icons are mandatory. Right-aligned icons are standard for modern UIs as they keep the text edge clean, though left-aligned icons track closer to Western reading patterns. The icon must physically change (rotate or swap) to indicate the open/closed state.
* **Generous Hit Targets:** The entire header row—padding included, not just the text or icon—must be clickable and touch-friendly (minimum 44x44px for touch interfaces).
* **Predictable Behavior Models:** Decide on state management upfront. Use *concurrent expansion* (multiple panels open simultaneously) when users need to compare information across sections. Use *mutually exclusive expansion* (opening one panel automatically closes the others) when vertical screen space is heavily constrained.
* **Distinct State Indication:** Apply clear visual changes—such as subtle background color shifts, bold typography, or active border highlights—to differentiate between default, hover, focused, expanded, and disabled states.
* **Accessibility (a11y) First:** Semantic HTML is critical. Headers should act as `<button>` elements wrapped in headings (like `<h3>`). They must implement `aria-expanded="true/false"` attributes and be fully navigable via `Tab` and toggleable via `Space` or `Enter` keys.
* **Smooth Transitions:** Content should slide open using brief (~200-300ms) easing animations. This prevents jarring layout shifts and helps the user's eye track the newly revealed information as the page length changes.
