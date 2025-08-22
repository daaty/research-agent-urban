# ========================================
# CONFIGURAÇÃO OPENBOX - WINDOW MANAGER PARA VNC
# ========================================

# Menu principal do Openbox
cp -r /etc/xdg/openbox /root/.config/ 2>/dev/null || mkdir -p /root/.config/openbox

# Configuração do Openbox
cat > /root/.config/openbox/rc.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <resistance>
    <strength>10</strength>
    <screen_edge_strength>20</screen_edge_strength>
  </resistance>
  <focus>
    <focusNew>yes</focusNew>
    <followMouse>no</followMouse>
    <focusLast>yes</focusLast>
    <underMouse>no</underMouse>
    <focusDelay>200</focusDelay>
    <raiseOnFocus>no</raiseOnFocus>
  </focus>
  <placement>
    <policy>Smart</policy>
    <center>yes</center>
    <monitor>Any</monitor>
    <primaryMonitor>1</primaryMonitor>
  </placement>
  <theme>
    <name>Clearlooks</name>
    <titleLayout>NLIMC</titleLayout>
    <keepBorder>yes</keepBorder>
    <animateIconify>yes</animateIconify>
  </theme>
  <desktops>
    <number>2</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>Desktop 1</name>
      <name>Desktop 2</name>
    </names>
    <popupTime>875</popupTime>
  </desktops>
  <resize>
    <drawContents>yes</drawContents>
    <popupShow>Nonpixel</popupShow>
    <popupPosition>Center</popupPosition>
  </resize>
  <margins>
    <top>0</top>
    <bottom>30</bottom>
    <left>0</left>
    <right>0</right>
  </margins>
  <dock>
    <position>BottomLeft</position>
    <floatingX>0</floatingX>
    <floatingY>0</floatingY>
    <noStrut>no</noStrut>
    <stacking>Above</stacking>
    <direction>Vertical</direction>
    <autoHide>no</autoHide>
    <hideDelay>300</hideDelay>
    <showDelay>300</showDelay>
    <moveButton>Middle</moveButton>
  </dock>
  <keyboard>
    <chainQuitKey>C-g</chainQuitKey>
    <keybind key="A-F4">
      <action name="Close"/>
    </keybind>
    <keybind key="A-Tab">
      <action name="NextWindow">
        <finalactions>
          <action name="Focus"/>
          <action name="Raise"/>
          <action name="Unshade"/>
        </finalactions>
      </action>
    </keybind>
    <keybind key="A-S-Tab">
      <action name="PreviousWindow">
        <finalactions>
          <action name="Focus"/>
          <action name="Raise"/>
          <action name="Unshade"/>
        </finalactions>
      </action>
    </keybind>
    <keybind key="C-A-d">
      <action name="ToggleShowDesktop"/>
    </keybind>
  </keyboard>
  <mouse>
    <dragThreshold>3</dragThreshold>
    <doubleClickTime>200</doubleClickTime>
    <screenEdgeWarpTime>400</screenEdgeWarpTime>
    <context name="Frame">
      <mousebind button="A-Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="A-Left" action="Click">
        <action name="Unshade"/>
      </mousebind>
      <mousebind button="A-Left" action="Drag">
        <action name="Move"/>
      </mousebind>
    </context>
    <context name="Titlebar">
      <mousebind button="Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="Left" action="DoubleClick">
        <action name="ToggleMaximize"/>
      </mousebind>
      <mousebind button="Middle" action="Press">
        <action name="Lower"/>
        <action name="FocusToBottom"/>
        <action name="Unfocus"/>
      </mousebind>
      <mousebind button="Right" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
        <action name="ShowMenu">
          <menu>client-menu</menu>
        </action>
      </mousebind>
    </context>
  </mouse>
  <menu>
    <file>menu.xml</file>
    <hideDelay>200</hideDelay>
    <middle>no</middle>
    <submenuShowDelay>100</submenuShowDelay>
    <applicationIcons>yes</applicationIcons>
  </menu>
</openbox_config>
EOF

# Menu do Openbox
cat > /root/.config/openbox/menu.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_menu xmlns="http://openbox.org/3.4/menu">
  <menu id="apps-menu" label="Applications">
    <item label="Terminal">
      <action name="Execute">
        <command>lxterminal</command>
      </action>
    </item>
    <item label="File Manager">
      <action name="Execute">
        <command>pcmanfm</command>
      </action>
    </item>
    <separator/>
    <item label="Chrome Browser 1 (Extração)">
      <action name="Execute">
        <command>chromium-browser --user-data-dir=/app/browser-data/browser1 --window-position=0,0 --window-size=800,1170 --new-window</command>
      </action>
    </item>
    <item label="Chrome Browser 2 (Recarga)">
      <action name="Execute">
        <command>chromium-browser --user-data-dir=/app/browser-data/browser2 --window-position=800,0 --window-size=800,1170 --new-window</command>
      </action>
    </item>
  </menu>
  <menu id="root-menu" label="Openbox 3">
    <separator label="Research Agent Urban"/>
    <menu id="apps-menu"/>
    <separator/>
    <item label="Restart Openbox">
      <action name="Restart"/>
    </item>
  </menu>
</openbox_menu>
EOF

# Configuração do Tint2 (taskbar)
mkdir -p /root/.config/tint2
cat > /root/.config/tint2/tint2rc << 'EOF'
# Tint2 config file for Research Agent Urban VNC

# Panel
panel_size = 100% 30
panel_margin = 0 0
panel_padding = 7 0 7
panel_background_id = 1
panel_position = bottom center horizontal
panel_layer = top
panel_monitor = all
panel_shrink = 0
autohide = 0
autohide_show_timeout = 0
autohide_hide_timeout = 0.5
autohide_height = 2
strut_policy = follow_size
panel_window_name = tint2
disable_transparency = 1
mouse_effects = 1
font_shadow = 0
mouse_hover_icon_asb = 100 0 10
mouse_pressed_icon_asb = 100 0 0

# Taskbar
taskbar_mode = single_monitor
taskbar_hide_if_empty = 0
taskbar_padding = 0 0 2
taskbar_background_id = 0
taskbar_active_background_id = 0
taskbar_name = 1
taskbar_hide_inactive_tasks = 0
taskbar_hide_different_monitor = 0
taskbar_hide_different_desktop = 0
taskbar_always_show_all_desktop_tasks = 0
taskbar_name_padding = 4 2
taskbar_name_background_id = 0
taskbar_name_active_background_id = 0
taskbar_name_font_color = #e3e3e3 100
taskbar_name_active_font_color = #ffffff 100
taskbar_distribute_size = 0
taskbar_sort_order = none
task_align = left

# Task
task_text = 1
task_icon = 1
task_centered = 1
urgent_nb_of_blink = 100000
task_maximum_size = 150 35
task_padding = 2 2 4
task_tooltip = 1
task_thumbnail = 0
task_thumbnail_size = 210
task_font_color = #ffffff 100
task_background_id = 2
task_active_background_id = 3
task_urgent_background_id = 4
task_iconified_background_id = 2
mouse_left = toggle_iconify
mouse_middle = none
mouse_right = close
mouse_scroll_up = toggle
mouse_scroll_down = iconify

# System tray
systray_padding = 0 4 2
systray_background_id = 0
systray_sort = ascending
systray_icon_size = 24
systray_icon_asb = 100 0 0
systray_monitor = 1
systray_name_filter = 

# Launcher
launcher_padding = 2 4 2
launcher_background_id = 0
launcher_icon_background_id = 0
launcher_icon_size = 24
launcher_icon_asb = 100 0 0
launcher_icon_theme_override = 0
startup_notifications = 1
launcher_tooltip = 1
launcher_item_app = lxterminal.desktop
launcher_item_app = pcmanfm.desktop

# Clock
time1_format = %H:%M
time2_format = %A %d %B
time1_timezone = 
time2_timezone = 
clock_font_color = #ffffff 100
clock_padding = 2 0
clock_background_id = 0
clock_tooltip = 
clock_tooltip_timezone = 
clock_lclick_command = 
clock_rclick_command = orage
clock_mclick_command = 
clock_uwheel_command = 
clock_dwheel_command = 

# Battery
battery_tooltip = 1
battery_low_status = 10
battery_low_cmd = 
battery_full_cmd = 
bat1_font_color = #ffffff 100
bat2_font_color = #ffffff 100
battery_padding = 1 0
battery_background_id = 0
battery_hide = 101
battery_lclick_command = 
battery_rclick_command = 
battery_mclick_command = 
battery_uwheel_command = 
battery_dwheel_command = 
ac_connected_cmd = 
ac_disconnected_cmd = 

# Tooltip
tooltip_show_timeout = 0.5
tooltip_hide_timeout = 0.1
tooltip_padding = 4 4
tooltip_background_id = 5
tooltip_font_color = #222222 100

# Background definitions
rounded = 1
border_width = 2
border_sides = TBLR
background_color = #2B2B2B 60
border_color = #FFFFFF 18
background_color_hover = #2B2B2B 60
border_color_hover = #FFFFFF 18
background_color_pressed = #2B2B2B 60
border_color_pressed = #FFFFFF 18

rounded = 1
border_width = 0
border_sides = TBLR
background_color = #777777 20
border_color = #777777 30
background_color_hover = #AAAAAA 22
border_color_hover = #EAEAEA 44
background_color_pressed = #555555 4
border_color_pressed = #EAEAEA 44

rounded = 1
border_width = 0
border_sides = TBLR
background_color = #777777 20
border_color = #777777 30
background_color_hover = #AAAAAA 22
border_color_hover = #EAEAEA 44
background_color_pressed = #555555 4
border_color_pressed = #EAEAEA 44

rounded = 1
border_width = 0
border_sides = TBLR
background_color = #AA4400 100
border_color = #AA7733 100
background_color_hover = #CC7700 100
border_color_hover = #AA7733 100
background_color_pressed = #777777 25
border_color_pressed = #AA7733 100

rounded = 1
border_width = 0
border_sides = TBLR
background_color = #FF0000 100
border_color = #FF0000 100
background_color_hover = #FF0000 100
border_color_hover = #FF0000 100
background_color_pressed = #FF0000 100
border_color_pressed = #FF0000 100

rounded = 1
border_width = 1
border_sides = TBLR
background_color = #FFFFAA 90
border_color = #000000 100
background_color_hover = #FFFFAA 90
border_color_hover = #000000 100
background_color_pressed = #FFFFAA 90
border_color_pressed = #000000 100
EOF
