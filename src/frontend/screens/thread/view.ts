/* Copyright (C) 2018-2020 The Manyverse Authors.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Stream} from 'xstream';
import dropRepeatsByKeys from 'xstream-drop-repeats-by-keys';
import {h} from '@cycle/react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {ReactElement} from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {propifyMethods} from 'react-propify-methods';
import {Palette} from '../../global-styles/palette';
import {Dimensions} from '../../global-styles/dimens';
import FullThread from '../../components/FullThread';
import Avatar from '../../components/Avatar';
import EmptySection from '../../components/EmptySection';
import TopBar from '../../components/TopBar';
import {State} from './model';
import {styles, avatarSize} from './styles';

function ExpandReplyButton(isLastButton: boolean) {
  return h(
    TouchableOpacity,
    {
      sel: 'reply-expand',
      style: isLastButton ? styles.lastButtonInReply : styles.buttonInReply,
      activeOpacity: 0.2,
      accessible: true,
      accessibilityLabel: 'Expand Reply Button',
    },
    [
      h(Icon, {
        size: Dimensions.iconSizeNormal,
        color: Palette.foregroundNeutral,
        name: 'arrow-expand',
      }),
    ],
  );
}

function ReplySendButton() {
  return h(
    TouchableOpacity,
    {
      sel: 'reply-send',
      style: styles.lastButtonInReply,
      activeOpacity: 0.2,
      accessible: true,
      accessibilityLabel: 'Reply Publish Button',
    },
    [
      h(Icon, {
        size: Dimensions.iconSizeNormal,
        color: Palette.textCTA,
        name: 'send',
      }),
    ],
  );
}

function ReplyInput(state: State) {
  return h(View, {style: styles.replyRow}, [
    h(Avatar, {
      size: avatarSize,
      url: state.avatarUrl,
      style: styles.replyAvatar,
    }),
    h(View, {style: styles.replyInputContainer}, [
      h(TextInput, {
        accessible: true,
        accessibilityLabel: 'Reply Text Input',
        sel: 'reply-input',
        multiline: true,
        autoFocus: state.startedAsReply,
        returnKeyType: 'done',
        value: state.replyText,
        editable: state.replyEditable,
        placeholder: 'Comment',
        placeholderTextColor: Palette.textVeryWeak,
        selectionColor: Palette.backgroundTextSelection,
        underlineColorAndroid: Palette.textLine,
        style: styles.replyInput,
      }),
    ]),
    ExpandReplyButton(state.replyText.length === 0),
    state.replyText.length > 0 ? ReplySendButton() : null,
  ]);
}

const ReactiveScrollView = propifyMethods(ScrollView, 'scrollToEnd' as any);

type Actions = {
  willReply$: Stream<any>;
};

export default function view(state$: Stream<State>, actions: Actions) {
  const scrollToEnd$ = actions.willReply$.mapTo({animated: false});

  return state$
    .compose(
      dropRepeatsByKeys([
        'loading',
        'replyText',
        'keyboardVisible',
        'replyEditable',
        'startedAsReply',
        'avatarUrl',
        'getSelfRepliesReadable',
        'rootMsgId',
        'selfFeedId',
        s => s.thread.messages.length,
        s => s.thread.full,
      ]),
    )
    .map(state => {
      const topBar = h(TopBar, {sel: 'topbar', title: 'Thread'});

      if (!state.loading && state.thread.errorReason === 'missing') {
        return h(View, {style: styles.container}, [
          topBar,
          h(EmptySection, {
            style: styles.emptySection,
            title: 'Missing data',
            description: [
              "You don't yet have data \n for the message known by the ID\n",
              h(
                Text,
                {style: styles.missingMsgId},
                state.rootMsgId as string,
              ) as ReactElement<any>,
            ],
          }),
        ]);
      }
      if (!state.loading && state.thread.errorReason === 'blocked') {
        return h(View, {style: styles.container}, [
          topBar,
          h(EmptySection, {
            style: styles.emptySection,
            title: 'Blocked thread',
            description: 'You have chosen to block\nthe author of this thread',
          }),
        ]);
      }
      if (!state.loading && state.thread.errorReason === 'unknown') {
        return h(View, {style: styles.container}, [
          topBar,
          h(EmptySection, {
            style: styles.emptySection,
            title: 'Sorry',
            description:
              "This app doesn't know how to process\nand display this thread correctly",
          }),
        ]);
      }

      const behaviorProp =
        Platform.OS === 'ios' ? 'behavior' : 'IGNOREbehavior';

      return h(View, {style: styles.container}, [
        topBar,
        h(
          KeyboardAvoidingView,
          {
            enabled: state.keyboardVisible,
            style: styles.container,
            [behaviorProp]: 'padding',
          },
          [
            h(
              ReactiveScrollView,
              {
                style: styles.scrollView,
                scrollToEnd$,
                keyboardDismissMode: 'interactive',
                refreshControl: h(RefreshControl, {
                  refreshing: state.thread.messages.length === 0,
                  colors: [Palette.backgroundBrand],
                }),
              },
              [
                h(FullThread, {
                  sel: 'thread',
                  thread: state.thread,
                  selfFeedId: state.selfFeedId,
                  publication$: actions.willReply$,
                }),
              ],
            ),
            ReplyInput(state),
          ],
        ),
      ]);
    });
}
