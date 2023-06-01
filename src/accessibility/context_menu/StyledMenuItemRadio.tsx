/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from "react";

import { useRovingTabIndex } from "../RovingTabIndex";
import StyledRadioButton from "../../components/views/elements/StyledRadioButton";
import { KeyBindingAction } from "../KeyboardShortcuts";
import { getKeyBindingsManager } from "../../KeyBindingsManager";

interface IProps extends React.ComponentProps<typeof StyledRadioButton> {
    label?: string;
    onChange(): void; // we handle keyup/down ourselves so lose the ChangeEvent
    onClose(): void; // gets called after onChange on KeyBindingAction.Enter
}

// Semantic component for representing a styled role=menuitemradio
export const StyledMenuItemRadio: React.FC<IProps> = ({ children, label, onChange, onClose, ...props }) => {
    const [onFocus, isActive, ref] = useRovingTabIndex<HTMLInputElement>();

    const onKeyDown = (e: React.KeyboardEvent): void => {
        let handled = true;
        const action = getKeyBindingsManager().getAccessibilityAction(e);

        switch (action) {
            case KeyBindingAction.Space:
                onChange();
                break;
            case KeyBindingAction.Enter:
                onChange();
                // Implements https://www.w3.org/TR/wai-aria-practices/#keyboard-interaction-12
                onClose();
                break;
            default:
                handled = false;
        }

        if (handled) {
            e.stopPropagation();
            e.preventDefault();
        }
    };
    const onKeyUp = (e: React.KeyboardEvent): void => {
        const action = getKeyBindingsManager().getAccessibilityAction(e);
        switch (action) {
            case KeyBindingAction.Enter:
            case KeyBindingAction.Space:
                // prevent the input default handler as we handle it on keydown to match
                // https://www.w3.org/TR/wai-aria-practices/examples/menubar/menubar-2/menubar-2.html
                e.stopPropagation();
                e.preventDefault();
                break;
        }
    };
    return (
        <StyledRadioButton
            {...props}
            role="menuitemradio"
            aria-label={label}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            inputRef={ref}
            tabIndex={isActive ? 0 : -1}
        >
            {children}
        </StyledRadioButton>
    );
};
