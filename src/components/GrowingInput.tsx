import { forwardRef, useState } from 'react';
import { Platform, TextInput, type TextInputInstance, type TextInputProps } from 'react-native';

/**
 * Multiline input that grows with its text. Native inputs already do; web textareas don't,
 * so on the web the height follows the content size and starts at one row.
 */
export const GrowingInput = forwardRef<TextInputInstance, TextInputProps>(function GrowingInput({ style, onContentSizeChange, ...rest }, ref) {
  const [height, setHeight] = useState<number | undefined>(undefined);
  if (Platform.OS !== 'web') return <TextInput ref={ref} multiline style={style} onContentSizeChange={onContentSizeChange} {...rest} />;
  return (
    <TextInput
      ref={ref}
      multiline
      {...({ rows: 1 } as object)}
      {...rest}
      onContentSizeChange={(e) => {
        setHeight(e.nativeEvent.contentSize.height);
        onContentSizeChange?.(e);
      }}
      style={[style, { outlineStyle: 'none' } as object, height ? { height } : null]}
    />
  );
});
