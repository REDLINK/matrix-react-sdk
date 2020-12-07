/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, {createRef} from 'react';

import AutoDiscoveryUtils, {ValidatedServerConfig} from "../../../utils/AutoDiscoveryUtils";
import BaseDialog from './BaseDialog';
import { _t } from '../../../languageHandler';
import AccessibleButton from "../elements/AccessibleButton";
import SdkConfig from "../../../SdkConfig";
import Field from "../elements/Field";
import StyledRadioButton from "../elements/StyledRadioButton";
import TextWithTooltip from "../elements/TextWithTooltip";
import withValidation, {IFieldState} from "../elements/Validation";

interface IProps {
    title?: string;
    serverConfig: ValidatedServerConfig;
    onFinished(config?: ValidatedServerConfig): void;
}

interface IState {
    defaultChosen: boolean;
    otherHomeserver: string;
}

export default class ServerPickerDialog extends React.PureComponent<IProps, IState> {
    private readonly defaultServer: ValidatedServerConfig;
    private readonly fieldRef = createRef<Field>();
    private validatedConf: ValidatedServerConfig;

    constructor(props) {
        super(props);

        const config = SdkConfig.get();
        this.defaultServer = config["validated_server_config"] as ValidatedServerConfig;
        this.state = {
            defaultChosen: this.props.serverConfig.isDefault,
            otherHomeserver: this.props.serverConfig.isDefault ? "" : this.props.serverConfig.hsUrl,
        };
    }

    private onDefaultChosen = () => {
        this.setState({ defaultChosen: true });
    };

    private onOtherChosen = () => {
        this.setState({ defaultChosen: false });
    };

    private onHomeserverChange = (ev) => {
        this.setState({ otherHomeserver: ev.target.value });
    };

    // TODO: Do we want to support .well-known lookups here?
    // If for some reason someone enters "matrix.org" for a URL, we could do a lookup to
    // find their homeserver without demanding they use "https://matrix.org"
    private validate = withValidation<this, { error?: string }>({
        deriveData: async ({ value: hsUrl }) => {
            // Always try and use the defaults first
            const defaultConfig: ValidatedServerConfig = SdkConfig.get()["validated_server_config"];
            if (defaultConfig.hsUrl === hsUrl) return {};

            try {
                this.validatedConf = await AutoDiscoveryUtils.validateServerConfigWithStaticUrls(hsUrl);
                return {};
            } catch (e) {
                console.error(e);

                const stateForError = AutoDiscoveryUtils.authComponentStateForError(e);
                if (!stateForError.isFatalError) {
                    // carry on anyway
                    this.validatedConf = await AutoDiscoveryUtils.validateServerConfigWithStaticUrls(hsUrl, null, true);
                    return {};
                } else {
                    let error = _t("Unable to validate homeserver/identity server");
                    if (e.translatedMessage) {
                        error = e.translatedMessage;
                    }
                    return { error };
                }
            }
        },
        rules: [
            {
                key: "required",
                test: ({ value, allowEmpty }) => allowEmpty || !!value,
                invalid: () => _t("Specify a homeserver"),
            }, {
                key: "valid",
                test: async function({ value }, { error }) {
                    if (!value) return true;
                    return !error;
                },
                invalid: function({ error }) {
                    return error;
                },
            },
        ],
    });

    private onHomeserverValidate = (fieldState: IFieldState) => this.validate(fieldState);

    private onSubmit = async (ev) => {
        ev.preventDefault();

        const valid = await this.fieldRef.current.validate({ allowEmpty: false });

        if (!valid) {
            this.fieldRef.current.focus();
            this.fieldRef.current.validate({ allowEmpty: false, focused: true });
            return;
        }

        this.props.onFinished(this.validatedConf);
    };

    public render() {
        let text;
        if (this.defaultServer.hsName === "matrix.org") {
            text = _t("Matrix.org is the biggest public homeserver in the world, so it’s a good place for many.");
        }

        let defaultServerName = this.defaultServer.hsName;
        if (this.defaultServer.hsNameIsDifferent) {
            defaultServerName = (
                <TextWithTooltip class="mx_Login_underlinedServerName" tooltip={this.defaultServer.hsUrl}>
                    {this.defaultServer.hsName}
                </TextWithTooltip>
            );
        }

        return <BaseDialog
            title={this.props.title || _t("Sign into your homeserver")}
            className="mx_ServerPickerDialog"
            contentId="mx_ServerPickerDialog"
            onFinished={this.props.onFinished}
            fixedWidth={false}
            hasCancel={true}
        >
            <form className="mx_Dialog_content" id="mx_ServerPickerDialog" onSubmit={this.onSubmit}>
                <p>
                    {_t("We call the places where you can host your account ‘homeservers’.")} {text}
                </p>

                <StyledRadioButton
                    name="defaultChosen"
                    value="true"
                    checked={this.state.defaultChosen}
                    onChange={this.onDefaultChosen}
                >
                    {defaultServerName}
                </StyledRadioButton>

                <StyledRadioButton
                    name="defaultChosen"
                    value="false"
                    className="mx_ServerPickerDialog_otherHomeserverRadio"
                    checked={!this.state.defaultChosen}
                    onChange={this.onOtherChosen}
                >
                    <Field
                        type="text"
                        className="mx_ServerPickerDialog_otherHomeserver"
                        label={_t("Other homeserver")}
                        onChange={this.onHomeserverChange}
                        onClick={this.onOtherChosen}
                        ref={this.fieldRef}
                        onValidate={this.onHomeserverValidate}
                        value={this.state.otherHomeserver}
                        validateOnChange={false}
                        validateOnFocus={false}
                    />
                </StyledRadioButton>
                <p>
                    {_t("Use your preferred Matrix homeserver if you have one, or host your own.")}
                </p>

                <AccessibleButton className="mx_ServerPickerDialog_continue" kind="primary" onClick={this.onSubmit}>
                    {_t("Continue")}
                </AccessibleButton>

                <h4>{_t("Learn more")}</h4>
                <a href="https://matrix.org/faq/#what-is-a-homeserver%3F" target="_blank" rel="noreferrer noopener">
                    {_t("About homeservers")}
                </a>
            </form>
        </BaseDialog>;
    }
}