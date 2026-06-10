import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fromDateString(s: string | null): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function PickerSheet({
  visible,
  initial,
  mode,
  onDone,
  onCancel,
}: {
  visible: boolean;
  initial: Date;
  mode: "date" | "datetime";
  onDone: (d: Date) => void;
  onCancel: () => void;
}) {
  // iOS-only modal sheet with a spinner picker; Android uses system dialogs
  const [value, setValue] = useState(initial);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onCancel}>
        <Pressable
          className="rounded-t-3xl bg-surface-light pb-8 dark:bg-surface-dark"
          onPress={() => {}}
        >
          <View className="flex-row items-center justify-between px-5 py-3">
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text className="text-base text-gray-500">Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onDone(value)} hitSlop={8}>
              <Text className="text-base font-semibold text-brand-600">Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            minuteInterval={5}
            onChange={(_: DateTimePickerEvent, d?: Date) => d && setValue(d)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FieldShell({
  label,
  text,
  placeholder,
  onPress,
  onClear,
}: {
  label: string;
  text: string | null;
  placeholder: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <View className="mb-3 flex-1">
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-surface-light px-4 dark:border-gray-700 dark:bg-surface-dark"
      >
        <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
        <Text
          className={`ml-2 flex-1 text-base ${
            text ? "text-gray-900 dark:text-gray-100" : "text-gray-400"
          }`}
          numberOfLines={1}
        >
          {text ?? placeholder}
        </Text>
        {text && onClear ? (
          <Pressable onPress={onClear} hitSlop={8} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

/** Date-only picker field; value is "YYYY-MM-DD" or null (clearable). */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const openPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: fromDateString(value),
        mode: "date",
        onChange: (event, d) => {
          if (event.type === "set" && d) onChange(toDateString(d));
        },
      });
    } else {
      setOpen(true);
    }
  };

  const display = value
    ? fromDateString(value).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <FieldShell
        label={label}
        text={display}
        placeholder="Not set"
        onPress={openPicker}
        onClear={() => onChange(null)}
      />
      {open ? (
        <PickerSheet
          visible={open}
          initial={fromDateString(value)}
          mode="date"
          onCancel={() => setOpen(false)}
          onDone={(d) => {
            setOpen(false);
            onChange(toDateString(d));
          }}
        />
      ) : null}
    </>
  );
}

/** Date+time picker field; value is a Date. Android asks date then time. */
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);

  const openPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        onChange: (event, d) => {
          if (event.type !== "set" || !d) return;
          const datePart = d;
          DateTimePickerAndroid.open({
            value,
            mode: "time",
            is24Hour: true,
            minuteInterval: 5,
            onChange: (timeEvent, t) => {
              if (timeEvent.type !== "set" || !t) return;
              const merged = new Date(datePart);
              merged.setHours(t.getHours(), t.getMinutes(), 0, 0);
              onChange(merged);
            },
          });
        },
      });
    } else {
      setOpen(true);
    }
  };

  const display = value.toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <FieldShell label={label} text={display} placeholder="Pick a time" onPress={openPicker} />
      {open ? (
        <PickerSheet
          visible={open}
          initial={value}
          mode="datetime"
          onCancel={() => setOpen(false)}
          onDone={(d) => {
            setOpen(false);
            onChange(d);
          }}
        />
      ) : null}
    </>
  );
}
