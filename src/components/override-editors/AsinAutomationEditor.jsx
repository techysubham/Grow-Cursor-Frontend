import { Box, Typography, Alert, Button } from '@mui/material';
import { Restore as RestoreIcon } from '@mui/icons-material';

export default function AsinAutomationEditor({ 
  baseConfig, 
  overrideConfig, 
  isOverridden,
  customColumns,
  onSave,
  onReset
}) {
  return (
    <Box>
      {isOverridden && (
        <Alert severity="success" sx={{ mb: 2 }} action={
          <Button size="small" onClick={onReset} startIcon={<RestoreIcon />}>
            Reset
          </Button>
        }>
          You have customized ASIN automation settings
        </Alert>
      )}
      
      <Alert severity="info">
        ASIN Automation customization UI is coming soon. For now, you can use the base template settings.
      </Alert>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Base Config: {baseConfig?.enabled ? 'Enabled' : 'Disabled'}
        {baseConfig?.fieldConfigs && ` • ${baseConfig.fieldConfigs.length} field configs`}
      </Typography>
    </Box>
  );
}
