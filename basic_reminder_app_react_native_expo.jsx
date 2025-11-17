// App.js - Phiên bản nâng cấp
// Tính năng mới:
// ✔ Chỉnh sửa nhắc hẹn
// ✔ Nhắc lặp lại: hàng ngày / hàng tuần / không lặp
// ✔ Nhóm theo danh mục (Work, Study, Personal, Custom)
// ✔ Giao diện cơ bản

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [repeat, setRepeat] = useState('none'); // none | daily | weekly
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    (async () => {
      await requestPermissions();
      loadReminders();
    })();
  }, []);

  async function requestPermissions() {
    try {
      const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
      if (status !== 'granted') {
        Alert.alert('Không có quyền thông báo');
      }
    } catch (err) {}
  }

  const onChangeDate = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  async function saveReminders(data) {
    await AsyncStorage.setItem('@reminders', JSON.stringify(data));
  }

  async function loadReminders() {
    const raw = await AsyncStorage.getItem('@reminders');
    if (raw) setReminders(JSON.parse(raw));
  }

  async function scheduleNotification(item) {
    let trigger;
    if (item.repeat === 'daily') {
      trigger = { hour: new Date(item.date).getHours(), minute: new Date(item.date).getMinutes(), repeats: true };
    } else if (item.repeat === 'weekly') {
      trigger = { weekday: new Date(item.date).getDay() + 1, hour: new Date(item.date).getHours(), minute: new Date(item.date).getMinutes(), repeats: true };
    } else {
      trigger = item.date;
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: `${item.category} - Nhắc hẹn` ,
      },
      trigger,
    });
  }

  async function addOrEditReminder() {
    if (!title.trim()) return Alert.alert('Thiếu tiêu đề');

    if (editingId) {
      // CHỈNH SỬA
      const newList = reminders.map(r => {
        if (r.id === editingId) {
          return { ...r, title, date: date.toISOString(), category, repeat };
        }
        return r;
      });
      setReminders(newList);
      saveReminders(newList);
      setEditingId(null);
      setTitle('');
      return Alert.alert('Đã cập nhật nhắc hẹn!');
    }

    // THÊM MỚI
    const id = Date.now().toString();
    const item = { id, title, date: date.toISOString(), category, repeat, notificationId: null };
    item.notificationId = await scheduleNotification(item);

    const newList = [item, ...reminders];
    setReminders(newList);
    saveReminders(newList);
    setTitle('');
    Alert.alert('Đã thêm!');
  }

  function startEdit(item) {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setRepeat(item.repeat);
    setDate(new Date(item.date));
  }

  async function deleteReminder(item) {
    Alert.alert('Xóa?', item.title, [
      { text: 'Hủy' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.notificationId) await Notifications.cancelScheduledNotificationAsync(item.notificationId);
          } catch (e) {}
          const newList = reminders.filter(r => r.id !== item.id);
          setReminders(newList);
          saveReminders(newList);
        },
      },
    ]);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nhắc Hẹn - Nâng Cấp</Text>

      <View style={styles.form}>
        <TextInput placeholder="Tiêu đề" value={title} onChangeText={setTitle} style={styles.input} />

        {/* Danh mục */}
        <Text style={styles.label}>Danh mục</Text>
        <View style={styles.row}>
          {['Work', 'Study', 'Personal', 'Custom'].map(c => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.tag, category === c && styles.tagActive]}>
              <Text>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lặp lại */}
        <Text style={styles.label}>Lặp lại</Text>
        <View style={styles.row}>
          {[
            { key: 'none', label: 'Không' },
            { key: 'daily', label: 'Ngày' },
            { key: 'weekly', label: 'Tuần' },
          ].map(o => (
            <TouchableOpacity key={o.key} onPress={() => setRepeat(o.key)} style={[styles.tag, repeat === o.key && styles.tagActive]}>
              <Text>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date-Time */}
        <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateBtn}>
          <Text>Thời gian: {formatDate(date.toISOString())}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker value={date} mode="datetime" is24Hour display="default" onChange={onChangeDate} />
        )}

        <Button title={editingId ? 'Cập nhật nhắc hẹn' : 'Thêm nhắc hẹn'} onPress={addOrEditReminder} />
      </View>

      {/* Danh sách */}
      <Text style={styles.subHeader}>Danh sách</Text>
      <FlatList
        data={reminders}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text>{item.category} • {item.repeat}</Text>
              <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
            </View>
            <TouchableOpacity onPress={() => startEdit(item)} style={styles.editBtn}><Text style={{ color: 'white' }}>Sửa</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => deleteReminder(item)} style={styles.deleteBtn}><Text style={{ color: 'white' }}>Xóa</Text></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#f2f2f2' },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  form: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 5, marginBottom: 10 },
  label: { fontWeight: '600', marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderRadius: 6, borderColor: '#ccc', marginRight: 6, marginBottom: 6 },
  tagActive: { backgroundColor: '#a0e3a0' },
  dateBtn: { padding: 10, borderWidth: 1, borderRadius: 6, borderColor: '#ccc', marginBottom: 10 },
  subHeader: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  item: { flexDirection: 'row', backgroundColor: 'white', padding: 12, marginBottom: 10, borderRadius: 8, alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemDate: { fontSize: 12, color: '#666' },
  deleteBtn: { backgroundColor: '#e74c3c', padding: 8, borderRadius: 6, marginLeft: 6 },
  editBtn: { backgroundColor: '#2980b9', padding: 8, borderRadius: 6, marginLeft: 6 },
});
