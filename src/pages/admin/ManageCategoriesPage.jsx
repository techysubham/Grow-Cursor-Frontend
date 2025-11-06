import { useEffect, useState } from 'react';
import {
  Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Divider
} from '@mui/material';
import api from '../../lib/api.js';

export default function ManageCategoriesPage() {
  // Categories
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  
  // Subcategories
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  
  // Ranges
  const [ranges, setRanges] = useState([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [rangeName, setRangeName] = useState('');

  // Load categories
  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
  }, []);

  // Load subcategories when category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      api.get('/subcategories', { params: { categoryId: selectedCategoryId } })
        .then(({ data }) => setSubcategories(data));
    } else {
      setSubcategories([]);
      setSelectedSubcategoryId('');
    }
  }, [selectedCategoryId]);

  // Load ranges when subcategory is selected
  useEffect(() => {
    if (selectedSubcategoryId) {
      api.get('/ranges', { params: { subcategoryId: selectedSubcategoryId } })
        .then(({ data }) => setRanges(data));
    } else {
      setRanges([]);
    }
  }, [selectedSubcategoryId]);

  const addCategory = async (e) => {
    e.preventDefault();
    await api.post('/categories', { name: categoryName });
    setCategoryName('');
    const { data } = await api.get('/categories');
    setCategories(data);
  };

  const addSubcategory = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    await api.post('/subcategories', { name: subcategoryName, categoryId: selectedCategoryId });
    setSubcategoryName('');
    const { data } = await api.get('/subcategories', { params: { categoryId: selectedCategoryId } });
    setSubcategories(data);
  };

  const addRange = async (e) => {
    e.preventDefault();
    if (!selectedSubcategoryId) return;
    await api.post('/ranges', { name: rangeName, subcategoryId: selectedSubcategoryId });
    setRangeName('');
    const { data } = await api.get('/ranges', { params: { subcategoryId: selectedSubcategoryId } });
    setRanges(data);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Manage Categories, Subcategories & Ranges</Typography>

      {/* Categories Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Categories</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} component="form" onSubmit={addCategory}>
          <TextField
            label="Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained">Add Category</Button>
        </Stack>
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c._id}>
                  <TableCell>{c.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Subcategories Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Subcategories</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} component="form" onSubmit={addSubcategory}>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Subcategory Name"
            value={subcategoryName}
            onChange={(e) => setSubcategoryName(e.target.value)}
            required
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained" disabled={!selectedCategoryId}>
            Add Subcategory
          </Button>
        </Stack>
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Subcategory</TableCell>
                <TableCell>Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subcategories.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.category?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Ranges Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Ranges</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} component="form" onSubmit={addRange}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedSubcategoryId('');
              }}
            >
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }} disabled={!selectedCategoryId}>
            <InputLabel>Subcategory</InputLabel>
            <Select
              label="Subcategory"
              value={selectedSubcategoryId}
              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              required
            >
              {subcategories.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Range Name"
            value={rangeName}
            onChange={(e) => setRangeName(e.target.value)}
            required
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained" disabled={!selectedSubcategoryId}>
            Add Range
          </Button>
        </Stack>
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Range</TableCell>
                <TableCell>Subcategory</TableCell>
                <TableCell>Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranges.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.subcategory?.name}</TableCell>
                  <TableCell>{r.subcategory?.category?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
