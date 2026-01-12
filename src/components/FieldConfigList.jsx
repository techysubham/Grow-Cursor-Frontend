import { useState } from 'react';
import {
  Stack, Paper, IconButton, TextField, MenuItem, Switch,
  FormControlLabel, Typography, Collapse, Box, Chip
} from '@mui/material';
import { Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const AVAILABLE_EBAY_FIELDS = [
  { value: 'title', label: 'Title', supportsAI: true },
  { value: 'startPrice', label: 'Start Price', supportsAI: false },
  { value: 'buyItNowPrice', label: 'Buy It Now Price', supportsAI: false },
  { value: 'description', label: 'Description', supportsAI: true },
  { value: 'itemPhotoUrl', label: 'Item Photo URL', supportsAI: false },
  { value: 'categoryName', label: 'Category Name', supportsAI: true },
  { value: 'brand', label: 'Brand', supportsAI: false },
  { value: 'location', label: 'Location', supportsAI: true }
];

const DIRECT_SOURCE_OPTIONS = [
  { value: 'title', label: 'Amazon Title' },
  { value: 'price', label: 'Amazon Price' },
  { value: 'brand', label: 'Amazon Brand' },
  { value: 'description', label: 'Amazon Description' },
  { value: 'images', label: 'Amazon Images' }
];

const TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'pipeSeparated', label: 'Pipe Separated (for arrays)' },
  { value: 'removeSymbol', label: 'Remove Currency Symbols' },
  { value: 'truncate80', label: 'Truncate to 80 chars' },
  { value: 'htmlFormat', label: 'Convert to HTML' }
];

export default function FieldConfigList({ configs, onChange }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  
  const handleUpdate = (index, field, value) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    onChange(newConfigs);
  };
  
  const handleDelete = (index) => {
    onChange(configs.filter((_, i) => i !== index));
  };
  
  return (
    <Stack spacing={2}>
      {configs.map((config, index) => {
        const fieldInfo = AVAILABLE_EBAY_FIELDS.find(f => f.value === config.ebayField);
        const isExpanded = expandedIndex === index;
        
        return (
          <Paper key={index} sx={{ p: 2 }}>
            <Stack spacing={2}>
              {/* Header Row */}
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                  size="small"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <ExpandMoreIcon 
                    sx={{ 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: '0.3s'
                    }} 
                  />
                </IconButton>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">
                    {fieldInfo?.label || config.ebayField}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={0.5}>
                    <Chip 
                      label={config.source === 'ai' ? 'AI Generated' : 'Direct Mapping'} 
                      size="small"
                      color={config.source === 'ai' ? 'primary' : 'default'}
                    />
                    {!config.enabled && (
                      <Chip label="Disabled" size="small" color="error" variant="outlined" />
                    )}
                  </Stack>
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => handleUpdate(index, 'enabled', e.target.checked)}
                    />
                  }
                  label="Enabled"
                />
                
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleDelete(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
              
              {/* Expanded Configuration */}
              <Collapse in={isExpanded}>
                <Stack spacing={2} sx={{ pl: 5, pt: 1 }}>
                  <TextField
                    select
                    label="eBay Field"
                    value={config.ebayField}
                    onChange={(e) => handleUpdate(index, 'ebayField', e.target.value)}
                    fullWidth
                  >
                    {AVAILABLE_EBAY_FIELDS.map(field => (
                      <MenuItem key={field.value} value={field.value}>
                        {field.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  
                  <TextField
                    select
                    label="Source Type"
                    value={config.source}
                    onChange={(e) => {
                      const newSource = e.target.value;
                      handleUpdate(index, 'source', newSource);
                      // Reset related fields
                      if (newSource === 'ai') {
                        handleUpdate(index, 'amazonField', '');
                        handleUpdate(index, 'transform', 'none');
                      } else {
                        handleUpdate(index, 'promptTemplate', '');
                      }
                    }}
                    fullWidth
                  >
                    <MenuItem value="ai">AI Generated (uses prompt)</MenuItem>
                    <MenuItem value="direct">Direct Mapping (copy from Amazon)</MenuItem>
                  </TextField>
                  
                  {config.source === 'ai' ? (
                    <>
                      <TextField
                        label="AI Prompt Template"
                        multiline
                        rows={4}
                        value={config.promptTemplate || ''}
                        onChange={(e) => handleUpdate(index, 'promptTemplate', e.target.value)}
                        fullWidth
                        helperText="Available placeholders: {title}, {brand}, {description}, {price}, {asin}"
                        placeholder="Example: Generate an 80-character eBay title for {title} by {brand}..."
                      />
                    </>
                  ) : (
                    <>
                      <TextField
                        select
                        label="Amazon Source Field"
                        value={config.amazonField || ''}
                        onChange={(e) => handleUpdate(index, 'amazonField', e.target.value)}
                        fullWidth
                      >
                        {DIRECT_SOURCE_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      
                      <TextField
                        select
                        label="Transform"
                        value={config.transform || 'none'}
                        onChange={(e) => handleUpdate(index, 'transform', e.target.value)}
                        fullWidth
                      >
                        {TRANSFORM_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </>
                  )}
                </Stack>
              </Collapse>
            </Stack>
          </Paper>
        );
      })}
      
      {configs.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          No field configurations yet. Click "Add Field Configuration" to get started.
        </Paper>
      )}
    </Stack>
  );
}
