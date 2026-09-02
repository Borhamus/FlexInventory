import React, { useState } from 'react';
import { Popover, Button, theme as antdTheme } from 'antd';
import EmojiPickerReact, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';

export function useEmojiPreference(key: string): [string | null, (e: string | null) => void] {
  const [emoji, setEmoji] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key) || null;
    } catch {
      return null;
    }
  });

  const update = (nuevo: string | null) => {
    setEmoji(nuevo);
    try {
      if (nuevo) localStorage.setItem(key, nuevo);
      else localStorage.removeItem(key);
    } catch {
    }
  };

  return [emoji, update];
}

interface Props {
  value?: string | null;
  onChange: (emoji: string | null) => void;
  children: React.ReactNode;
}

export const EmojiPicker: React.FC<Props> = ({ value, onChange, children }) => {
  const { token } = antdTheme.useToken();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);

  const content = (
    <div>
      <EmojiPickerReact
        onEmojiClick={(data) => {
          onChange(data.emoji);
          setOpen(false);
        }}
        emojiStyle={EmojiStyle.NATIVE}
        theme={isDark ? Theme.DARK : Theme.LIGHT}
        lazyLoadEmojis
        skinTonesDisabled
        width={320}
        height={400}
        previewConfig={{ showPreview: false }}
      />
      {value && (
        <div style={{
          padding:    8,
          background: token.colorBgElevated,
          borderTop:  `1px solid ${token.colorBorderSecondary}`,
          borderBottomLeftRadius:  token.borderRadiusLG,
          borderBottomRightRadius: token.borderRadiusLG,
        }}>
          <Button
            type="text"
            size="small"
            block
            style={{ color: token.colorTextSecondary }}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Quitar emoji
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      content={content}
      overlayInnerStyle={{ padding: 0 }}
    >
      {children}
    </Popover>
  );
};

export default EmojiPicker;
